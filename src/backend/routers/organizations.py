from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..db.database import get_db
from ..models import models
from ..models import erp_models
from .auth import get_current_user

router = APIRouter()


class OrganizationCreate(BaseModel):
    name: str
    slug: str


class OrganizationUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None


class OrganizationResponse(BaseModel):
    id: int
    name: str
    slug: str

    class Config:
        from_attributes = True


@router.get("/api/organizations", response_model=list[OrganizationResponse])
def list_organizations(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    orgs = db.query(erp_models.Organization).all()
    return orgs


@router.post("/api/organizations", response_model=OrganizationResponse)
def create_organization(
    body: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if db.query(erp_models.Organization).filter(erp_models.Organization.slug == body.slug).first():
        raise HTTPException(status_code=400, detail="Slug already exists")
    org = erp_models.Organization(name=body.name, slug=body.slug)
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


@router.get("/api/organizations/{org_id}", response_model=OrganizationResponse)
def get_organization(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    org = db.query(erp_models.Organization).filter(erp_models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.patch("/api/organizations/{org_id}", response_model=OrganizationResponse)
def update_organization(
    org_id: int,
    body: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    org = db.query(erp_models.Organization).filter(erp_models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    if body.name is not None:
        org.name = body.name
    if body.slug is not None:
        org.slug = body.slug
    db.commit()
    db.refresh(org)
    return org


@router.delete("/api/organizations/{org_id}", status_code=204)
def delete_organization(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    org = db.query(erp_models.Organization).filter(erp_models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    db.delete(org)
    db.commit()
    return None
