from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..db.database import get_db
from ..models import models
from ..models import erp_models
from .auth import get_current_user

router = APIRouter()


class AuditLogResponse(BaseModel):
    id: int
    user_id: int | None
    tenant_id: int | None
    action: str
    resource_type: str | None
    resource_id: str | None
    ip_address: str | None
    created_at: str

    class Config:
        from_attributes = True


def log_audit(db: Session, user_id: int | None, action: str, resource_type: str | None = None,
              resource_id: str | None = None, old_value: str | None = None, new_value: str | None = None,
              tenant_id: int | None = None, ip_address: str | None = None):
    entry = erp_models.AuditLog(
        user_id=user_id,
        tenant_id=tenant_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        old_value=old_value,
        new_value=new_value,
        ip_address=ip_address,
    )
    db.add(entry)
    db.commit()


@router.get("/api/audit-logs", response_model=list[AuditLogResponse])
def list_audit_logs(
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    resource_type: str | None = None,
    action: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(erp_models.AuditLog).order_by(erp_models.AuditLog.created_at.desc())
    if resource_type:
        q = q.filter(erp_models.AuditLog.resource_type == resource_type)
    if action:
        q = q.filter(erp_models.AuditLog.action == action)
    rows = q.offset(offset).limit(limit).all()
    return [
        AuditLogResponse(
            id=r.id,
            user_id=r.user_id,
            tenant_id=r.tenant_id,
            action=r.action,
            resource_type=r.resource_type,
            resource_id=r.resource_id,
            ip_address=r.ip_address,
            created_at=r.created_at.isoformat() if r.created_at else "",
        )
        for r in rows
    ]
