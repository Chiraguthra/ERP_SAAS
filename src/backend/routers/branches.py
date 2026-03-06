from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..db.database import get_db
from ..models import models
from ..models import erp_models
from .auth import get_current_user

router = APIRouter()


class BranchCreate(BaseModel):
    organization_id: int
    name: str
    code: str | None = None
    address: str | None = None


class BranchUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    address: str | None = None


class BranchResponse(BaseModel):
    id: int
    organization_id: int
    name: str
    code: str | None
    address: str | None

    class Config:
        from_attributes = True


@router.get("/api/branches", response_model=list[BranchResponse])
def list_branches(
    organization_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(erp_models.Branch)
    if organization_id is not None:
        q = q.filter(erp_models.Branch.organization_id == organization_id)
    return q.all()


@router.post("/api/branches", response_model=BranchResponse)
def create_branch(
    body: BranchCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    org = db.query(erp_models.Organization).filter(erp_models.Organization.id == body.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    branch = erp_models.Branch(
        organization_id=body.organization_id,
        name=body.name,
        code=body.code,
        address=body.address,
    )
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch


@router.get("/api/branches/{branch_id}", response_model=BranchResponse)
def get_branch(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    branch = db.query(erp_models.Branch).filter(erp_models.Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    return branch


@router.patch("/api/branches/{branch_id}", response_model=BranchResponse)
def update_branch(
    branch_id: int,
    body: BranchUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    branch = db.query(erp_models.Branch).filter(erp_models.Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    if body.name is not None:
        branch.name = body.name
    if body.code is not None:
        branch.code = body.code
    if body.address is not None:
        branch.address = body.address
    db.commit()
    db.refresh(branch)
    return branch


@router.delete("/api/branches/{branch_id}", status_code=204)
def delete_branch(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    branch = db.query(erp_models.Branch).filter(erp_models.Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    db.delete(branch)
    db.commit()
    return None
