from datetime import datetime
from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional, Any
from pydantic import BaseModel, ConfigDict
from ..db.database import get_db
from ..models import models
from .auth import get_current_user

router = APIRouter()


# Map camelCase (API/frontend) to snake_case (DB model)
_CUSTOMER_KEY_MAP = {
    "pinCode": "pin_code",
    "createdOn": "created_on",
    "emailId": "email_id",
    "contactPerson": "contact_person",
    "isLead": "is_lead",
    "leadStatus": "lead_status",
    "leadSource": "lead_source",
    "assignedTo": "assigned_to",
    "clientMigrationDate": "client_migration_date",
    "leadCloseCode": "lead_close_code",
    "createdBy": "created_by",
    "leadClosedAt": "lead_closed_at",
    "leadId": "lead_id",
}


class CustomerBase(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pin_code: Optional[int] = None
    country: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    email_id: Optional[str] = None
    contact_person: Optional[str] = None
    is_lead: Optional[str] = None
    lead_status: Optional[str] = None
    lead_source: Optional[str] = None
    assigned_to: Optional[str] = None
    client_migration_date: Optional[datetime] = None
    gstin: Optional[str] = None
    status: Optional[str] = None
    username: Optional[str] = None
    lead_close_code: Optional[int] = None
    created_by: Optional[str] = None
    location: Optional[str] = None
    lead_closed_at: Optional[datetime] = None
    lead_id: Optional[str] = None
    pan: Optional[str] = None


class CustomerResponse(CustomerBase):
    id: int
    created_on: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


def _safe_str(v: Any) -> Optional[str]:
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None


def _safe_dt(v: Any) -> Optional[str]:
    if v is None:
        return None
    if hasattr(v, "isoformat"):
        return v.isoformat()
    return str(v)


def _customer_to_response(c: models.Customer) -> dict:
    """Serialize a customer row; safe for CSV-inserted rows and NULLs. Keys camelCase for API."""
    if c is None:
        return _empty_customer_response(0)
    return {
        "id": c.id,
        "name": _safe_str(c.name) or _safe_str(c.company) or _safe_str(c.contact_person) or "",
        "company": _safe_str(c.company),
        "address": _safe_str(c.address),
        "city": _safe_str(c.city),
        "state": _safe_str(c.state),
        "pinCode": c.pin_code if c.pin_code is not None else None,
        "country": _safe_str(c.country),
        "createdOn": _safe_dt(c.created_on),
        "website": _safe_str(c.website),
        "phone": _safe_str(c.phone),
        "emailId": _safe_str(c.email_id) or _safe_str(getattr(c, "email", None)),
        "email": _safe_str(c.email_id) or _safe_str(getattr(c, "email", None)),  # backward compat for OrderDetail
        "contactPerson": _safe_str(c.contact_person),
        "isLead": _safe_str(c.is_lead),
        "leadStatus": _safe_str(c.lead_status),
        "leadSource": _safe_str(c.lead_source),
        "assignedTo": _safe_str(c.assigned_to),
        "clientMigrationDate": _safe_dt(c.client_migration_date),
        "gstin": _safe_str(c.gstin),
        "status": _safe_str(c.status),
        "username": _safe_str(c.username),
        "leadCloseCode": c.lead_close_code,
        "createdBy": _safe_str(c.created_by),
        "location": _safe_str(c.location),
        "leadClosedAt": _safe_dt(c.lead_closed_at),
        "leadId": _safe_str(c.lead_id),
        "pan": _safe_str(c.pan),
    }


def _empty_customer_response(id: int) -> dict:
    return {
        "id": id,
        "name": "",
        "company": None,
        "address": None,
        "city": None,
        "state": None,
        "pinCode": None,
        "country": None,
        "createdOn": None,
        "website": None,
        "phone": None,
        "emailId": None,
        "email": None,
        "contactPerson": None,
        "isLead": None,
        "leadStatus": None,
        "leadSource": None,
        "assignedTo": None,
        "clientMigrationDate": None,
        "gstin": None,
        "status": None,
        "username": None,
        "leadCloseCode": None,
        "createdBy": None,
        "location": None,
        "leadClosedAt": None,
        "leadId": None,
        "pan": None,
    }


@router.get("/customers")
def list_customers(
    q: Optional[str] = Query(default=None),
    limit: int = Query(default=25, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Customer)
    if q:
        q_like = f"%{q.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(func.coalesce(models.Customer.name, "")).like(q_like),
                func.lower(func.coalesce(models.Customer.company, "")).like(q_like),
                func.lower(func.coalesce(models.Customer.contact_person, "")).like(q_like),
                func.lower(func.coalesce(models.Customer.email_id, "")).like(q_like),
                func.lower(func.coalesce(models.Customer.email, "")).like(q_like),
                func.lower(func.coalesce(models.Customer.city, "")).like(q_like),
                func.lower(func.coalesce(models.Customer.state, "")).like(q_like),
            )
        )
    total = query.order_by(None).count()
    rows = query.order_by(models.Customer.id.desc()).offset(offset).limit(limit).all()
    return {
        "items": [_customer_to_response(c) for c in rows],
        "total": int(total),
        "offset": int(offset),
        "limit": int(limit),
    }


@router.get("/customers/{id}")
def get_customer(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    c = db.query(models.Customer).filter(models.Customer.id == id).first()
    if not c:
        raise HTTPException(404, "Customer not found")
    return _customer_to_response(c)


def _payload_to_model_dict(payload: dict) -> dict:
    """Convert API payload (camelCase) to model attributes (snake_case). Skip empty strings and invalid numerics."""
    out = {}
    int_attrs = {"pin_code", "lead_close_code"}
    for k, v in payload.items():
        attr = _CUSTOMER_KEY_MAP.get(k, k)
        if not hasattr(models.Customer, attr):
            continue
        if v is None:
            continue
        if isinstance(v, str) and v.strip() == "":
            continue
        if attr in int_attrs:
            try:
                n = int(v) if v != "" else None
                if n is not None:
                    out[attr] = n
            except (TypeError, ValueError):
                pass
            continue
        else:
            out[attr] = v.strip() if isinstance(v, str) else v
    return out


@router.post("/customers")
def create_customer(payload: dict = Body(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    data = _payload_to_model_dict(payload)
    # Allow creating with no fields (all optional); use None for empty name so multiple unnamed customers are allowed
    if not data:
        data = {}
    db_customer = models.Customer(**data)
    db.add(db_customer)
    try:
        db.commit()
        db.refresh(db_customer)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="A customer with this name already exists.")
    return _customer_to_response(db_customer)


@router.patch("/customers/{id}")
def update_customer(id: int, payload: dict = Body(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    c = db.query(models.Customer).filter(models.Customer.id == id).first()
    if not c:
        raise HTTPException(404, "Customer not found")
    data = _payload_to_model_dict(payload)
    for key, value in data.items():
        setattr(c, key, value)
    try:
        db.commit()
        db.refresh(c)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="A customer with this name already exists.")
    return _customer_to_response(c)


@router.delete("/customers/{id}")
def delete_customer(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    c = db.query(models.Customer).filter(models.Customer.id == id).first()
    if not c:
        raise HTTPException(404, "Customer not found")
    db.delete(c)
    db.commit()
    return {"status": "success"}
