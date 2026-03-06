from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import insert, delete
from pydantic import BaseModel
from ..db.database import get_db
from ..models import models
from ..models import erp_models
from .auth import get_current_user

router = APIRouter()


class PermissionResponse(BaseModel):
    id: int
    code: str
    name: str
    module: str | None

    class Config:
        from_attributes = True


class RoleCreate(BaseModel):
    name: str
    code: str
    description: str | None = None
    permission_codes: list[str] = []


class RoleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    permission_codes: list[str] | None = None


class RoleResponse(BaseModel):
    id: int
    name: str
    code: str
    description: str | None

    class Config:
        from_attributes = True


def _role_with_permissions(role, db):
    perms = (
        db.query(erp_models.Permission)
        .join(erp_models.role_permissions)
        .filter(erp_models.role_permissions.c.role_id == role.id)
        .all()
    )
    return {**RoleResponse.model_validate(role).model_dump(), "permissions": [p.code for p in perms]}


@router.get("/api/permissions", response_model=list[PermissionResponse])
def list_permissions(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(erp_models.Permission).all()


@router.get("/api/roles", response_model=list[dict])
def list_roles(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    roles = db.query(erp_models.Role).all()
    return [_role_with_permissions(r, db) for r in roles]


@router.post("/api/roles", response_model=dict)
def create_role(
    body: RoleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if db.query(erp_models.Role).filter(erp_models.Role.code == body.code).first():
        raise HTTPException(status_code=400, detail="Role code already exists")
    role = erp_models.Role(name=body.name, code=body.code, description=body.description)
    db.add(role)
    db.commit()
    db.refresh(role)
    for code in body.permission_codes:
        perm = db.query(erp_models.Permission).filter(erp_models.Permission.code == code).first()
        if perm:
            db.execute(insert(erp_models.role_permissions).values(role_id=role.id, permission_id=perm.id))
    db.commit()
    return _role_with_permissions(role, db)


@router.get("/api/roles/{role_id}", response_model=dict)
def get_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    role = db.query(erp_models.Role).filter(erp_models.Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return _role_with_permissions(role, db)


@router.patch("/api/roles/{role_id}", response_model=dict)
def update_role(
    role_id: int,
    body: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    role = db.query(erp_models.Role).filter(erp_models.Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if body.name is not None:
        role.name = body.name
    if body.description is not None:
        role.description = body.description
    if body.permission_codes is not None:
        db.execute(delete(erp_models.role_permissions).where(erp_models.role_permissions.c.role_id == role_id))
        for code in body.permission_codes:
            perm = db.query(erp_models.Permission).filter(erp_models.Permission.code == code).first()
            if perm:
                db.execute(insert(erp_models.role_permissions).values(role_id=role_id, permission_id=perm.id))
    db.commit()
    db.refresh(role)
    return _role_with_permissions(role, db)


@router.delete("/api/roles/{role_id}", status_code=204)
def delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    role = db.query(erp_models.Role).filter(erp_models.Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    db.execute(delete(erp_models.role_permissions).where(erp_models.role_permissions.c.role_id == role_id))
    db.delete(role)
    db.commit()
    return None
