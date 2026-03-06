from fastapi import APIRouter, Depends, HTTPException, status, Body, Header
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from ..db.database import get_db
from ..models import models
from pydantic import BaseModel, ConfigDict
import os

# Config
SECRET_KEY = os.getenv("SESSION_SECRET", "r3tail-app-python-secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name, str(default))
    try:
        return int(raw)
    except (TypeError, ValueError):
        return default


MOBILE_POC_ENABLED = os.getenv("MOBILE_POC_ENABLED", "false").strip().lower() in {"1", "true", "yes", "on"}
MOBILE_POC_SECRET = os.getenv("MOBILE_POC_SECRET", "").strip()
MOBILE_POC_USERNAME = os.getenv("MOBILE_POC_USERNAME", "admin").strip() or "admin"
MOBILE_POC_TOKEN_TTL_DAYS = max(1, _env_int("MOBILE_POC_TOKEN_TTL_DAYS", 30))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

router = APIRouter()

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: int
    username: str
    name: str
    role: str
    model_config = ConfigDict(from_attributes=True)


class MobileBootstrapRequest(BaseModel):
    secret: Optional[str] = None
    username: Optional[str] = None

# Bcrypt accepts at most 72 bytes; use bcrypt lib directly (avoids passlib init bug on some setups)
def _password_bytes(s: str) -> bytes:
    raw = (s or "").encode("utf-8")
    return raw[:72] if len(raw) > 72 else raw

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    if not plain_password:
        return False
    try:
        plain = _password_bytes(plain_password)
        # Ensure stored hash is bytes and properly encoded
        if isinstance(hashed_password, str):
            stored = hashed_password.encode("utf-8")
        else:
            stored = hashed_password
        return bcrypt.checkpw(plain, stored)
    except Exception as e:
        print(f"Password verification error: {e}")
        return False

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(_password_bytes(password), bcrypt.gensalt()).decode("ascii")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

@router.post("/api/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    valid = False
    if (user.password or "").startswith("$2"):
        try:
            valid = verify_password(form_data.password, user.password)
        except Exception:
            valid = False
    else:
        # Legacy: plain-text password (e.g. old seed); upgrade to hash on success
        valid = form_data.password == user.password
        if valid:
            user.password = get_password_hash(form_data.password)
            db.commit()
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/api/user", response_model=UserResponse)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.post("/api/mobile/bootstrap")
async def mobile_bootstrap(
    payload: Optional[MobileBootstrapRequest] = Body(default=None),
    x_mobile_secret: Optional[str] = Header(default=None, alias="X-Mobile-Secret"),
    db: Session = Depends(get_db),
):
    """
    POC endpoint for Android WebView auto-login.
    Disabled by default; requires MOBILE_POC_ENABLED=true and MOBILE_POC_SECRET.
    """
    if not MOBILE_POC_ENABLED or not MOBILE_POC_SECRET:
        # Keep endpoint inert unless explicitly enabled.
        raise HTTPException(status_code=404, detail="Not found")

    provided_secret = (
        (payload.secret if payload and payload.secret else None)
        or (x_mobile_secret or None)
    )
    if not provided_secret or provided_secret != MOBILE_POC_SECRET:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid mobile bootstrap secret")

    requested_username = (payload.username if payload and payload.username else None)
    username = (requested_username or MOBILE_POC_USERNAME or "admin").strip()
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"Bootstrap user '{username}' not found")

    expires_delta = timedelta(days=MOBILE_POC_TOKEN_TTL_DAYS)
    access_token = create_access_token(data={"sub": user.username}, expires_delta=expires_delta)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in_seconds": int(expires_delta.total_seconds()),
        "user": {
            "id": user.id,
            "username": user.username,
            "name": user.name,
            "role": user.role,
        },
    }


@router.post("/api/logout")
async def logout():
    """Client clears token; this endpoint just returns 200 for compatibility."""
    return {}

# Seed admin if not exists; fix password if stored as plain text (legacy)
@router.on_event("startup")
async def seed_admin():
    db = next(get_db())
    try:
        admin = db.query(models.User).filter(models.User.username == "admin").first()
        if admin:
            # Ensure password is hashed (fix legacy plain-text "admin123")
            if not (admin.password or "").startswith("$2"):
                admin.password = get_password_hash("admin123")
                db.commit()
        else:
            new_admin = models.User(
                username="admin",
                password=get_password_hash("admin123"),
                name="Admin User",
                role="admin"
            )
            db.add(new_admin)
            db.commit()
    finally:
        db.close()
