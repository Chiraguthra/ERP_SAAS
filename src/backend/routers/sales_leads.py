"""Customer / Sales Lead - standalone CRUD, no relation to customers or orders."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from ..db.database import get_db
from ..models import models
from .auth import get_current_user

router = APIRouter()


class SalesLeadCreate(BaseModel):
    customer: Optional[str] = None
    company: Optional[str] = None
    designation: Optional[str] = None
    status: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    assigned: Optional[str] = None
    product: Optional[str] = None
    remarks: Optional[str] = None


class SalesLeadUpdate(BaseModel):
    customer: Optional[str] = None
    company: Optional[str] = None
    designation: Optional[str] = None
    status: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    assigned: Optional[str] = None
    product: Optional[str] = None
    remarks: Optional[str] = None


def _to_item(lead: models.SalesLead) -> dict:
    return {
        "id": lead.id,
        "customer": lead.customer,
        "company": lead.company,
        "designation": lead.designation,
        "status": lead.status,
        "phone": lead.phone,
        "city": lead.city,
        "assigned": lead.assigned,
        "product": lead.product,
        "remarks": lead.remarks,
    }


@router.get("/api/sales-leads")
def list_sales_leads(
    city: Optional[str] = Query(None, description="Search/filter by city (partial match)"),
    company: Optional[str] = Query(None, description="Search/filter by company (partial match)"),
    customer: Optional[str] = Query(None, description="Search/filter by customer name (partial match)"),
    limit: int = Query(500, le=10000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.SalesLead)
    if city is not None and city.strip() != "":
        q = q.filter(models.SalesLead.city.ilike(f"%{city.strip()}%"))
    if company is not None and company.strip() != "":
        q = q.filter(models.SalesLead.company.ilike(f"%{company.strip()}%"))
    if customer is not None and customer.strip() != "":
        q = q.filter(models.SalesLead.customer.ilike(f"%{customer.strip()}%"))
    total = q.count()
    leads = q.order_by(models.SalesLead.id.desc()).offset(offset).limit(limit).all()
    return {"sales_leads": [_to_item(l) for l in leads], "total": total}


@router.get("/api/sales-leads/cities")
def list_cities(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Distinct cities for filter dropdown."""
    rows = db.query(models.SalesLead.city).distinct().filter(models.SalesLead.city.isnot(None)).filter(models.SalesLead.city != "").order_by(models.SalesLead.city).all()
    return {"cities": [r[0] for r in rows if r[0]]}


@router.get("/api/sales-leads/companies")
def list_companies(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Distinct companies for filter dropdown."""
    rows = db.query(models.SalesLead.company).distinct().filter(models.SalesLead.company.isnot(None)).filter(models.SalesLead.company != "").order_by(models.SalesLead.company).all()
    return {"companies": [r[0] for r in rows if r[0]]}


@router.get("/api/sales-leads/{lead_id}")
def get_sales_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    lead = db.query(models.SalesLead).filter(models.SalesLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Sales lead not found")
    return _to_item(lead)


@router.post("/api/sales-leads")
def create_sales_lead(
    body: SalesLeadCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    lead = models.SalesLead(
        customer=body.customer,
        company=body.company,
        designation=body.designation,
        status=body.status,
        phone=body.phone,
        city=body.city,
        assigned=body.assigned,
        product=body.product,
        remarks=body.remarks,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return _to_item(lead)


@router.patch("/api/sales-leads/{lead_id}")
def update_sales_lead(
    lead_id: int,
    body: SalesLeadUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    lead = db.query(models.SalesLead).filter(models.SalesLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Sales lead not found")
    if body.customer is not None:
        lead.customer = body.customer
    if body.company is not None:
        lead.company = body.company
    if body.designation is not None:
        lead.designation = body.designation
    if body.status is not None:
        lead.status = body.status
    if body.phone is not None:
        lead.phone = body.phone
    if body.city is not None:
        lead.city = body.city
    if body.assigned is not None:
        lead.assigned = body.assigned
    if body.product is not None:
        lead.product = body.product
    if body.remarks is not None:
        lead.remarks = body.remarks
    db.commit()
    db.refresh(lead)
    return _to_item(lead)


@router.delete("/api/sales-leads/{lead_id}")
def delete_sales_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    lead = db.query(models.SalesLead).filter(models.SalesLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Sales lead not found")
    db.delete(lead)
    db.commit()
    return {"ok": True}
