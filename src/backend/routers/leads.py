"""Leads: Capture and manage leads from the marketing website."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional

from ..db.database import get_db
from ..models import models
from ..models import erp_models
from .auth import get_current_user

router = APIRouter()


class LeadCreate(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    message: Optional[str] = None
    source: Optional[str] = "website"


class LeadResponse(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str]
    email: str
    phone: Optional[str]
    company: Optional[str]
    message: Optional[str]
    source: Optional[str]
    status: str
    created_at: Optional[str]

    class Config:
        from_attributes = True


def _to_response(lead: erp_models.Lead) -> dict:
    return {
        "id": lead.id,
        "first_name": lead.first_name,
        "last_name": lead.last_name,
        "email": lead.email,
        "phone": lead.phone,
        "company": lead.company,
        "message": lead.message,
        "source": lead.source,
        "status": lead.status,
        "created_at": lead.created_at.isoformat() if lead.created_at else None,
    }


@router.post("/api/leads", response_model=LeadResponse)
def create_lead(
    body: LeadCreate,
    db: Session = Depends(get_db),
):
    """Create a new lead from the website contact form. No authentication required."""
    lead = erp_models.Lead(
        first_name=body.first_name,
        last_name=body.last_name,
        email=body.email,
        phone=body.phone,
        company=body.company,
        message=body.message,
        source=body.source or "website",
        status="new",
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return _to_response(lead)


@router.get("/api/leads")
def list_leads(
    status: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all leads. In production, add auth check."""
    q = db.query(erp_models.Lead)
    if status:
        q = q.filter(erp_models.Lead.status == status)
    leads = q.order_by(erp_models.Lead.created_at.desc()).offset(offset).limit(limit).all()
    return {"leads": [_to_response(l) for l in leads], "total": q.count()}


@router.get("/api/leads/{lead_id}")
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    lead = db.query(erp_models.Lead).filter(erp_models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return _to_response(lead)


@router.patch("/api/leads/{lead_id}")
def update_lead_status(
    lead_id: int,
    status: str = Query(..., description="new, contacted, qualified, converted"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update lead status."""
    lead = db.query(erp_models.Lead).filter(erp_models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead.status = status
    db.commit()
    db.refresh(lead)
    return _to_response(lead)
