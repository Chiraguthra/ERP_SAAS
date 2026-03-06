"""SaaS: Subscription billing, Plan management, Feature toggles per tenant, Usage limits, Backup."""
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import json
import io

from ..db.database import get_db
from ..models import models
from ..models import erp_models
from .auth import get_current_user

router = APIRouter()


# --- Subscription plans ---

class PlanCreate(BaseModel):
    name: str
    code: str
    price_monthly: float = 0
    price_yearly: float = 0
    max_users: Optional[int] = None
    max_storage_mb: Optional[int] = None


@router.get("/api/saas/plans")
def list_plans(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    plans = db.query(erp_models.SubscriptionPlan).filter(erp_models.SubscriptionPlan.is_active == True).all()
    return {"plans": [{"id": p.id, "name": p.name, "code": p.code, "price_monthly": float(p.price_monthly or 0), "price_yearly": float(p.price_yearly or 0), "max_users": p.max_users, "max_storage_mb": p.max_storage_mb} for p in plans]}


@router.post("/api/saas/plans")
def create_plan(
    body: PlanCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    if db.query(erp_models.SubscriptionPlan).filter(erp_models.SubscriptionPlan.code == body.code).first():
        raise HTTPException(status_code=400, detail="Plan code exists")
    p = erp_models.SubscriptionPlan(
        name=body.name,
        code=body.code,
        price_monthly=Decimal(str(body.price_monthly)),
        price_yearly=Decimal(str(body.price_yearly)),
        max_users=body.max_users,
        max_storage_mb=body.max_storage_mb,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"id": p.id, "code": p.code}


# --- Tenant subscription ---

@router.get("/api/saas/subscriptions")
def list_subscriptions(
    organization_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(erp_models.TenantSubscription, erp_models.SubscriptionPlan).join(
        erp_models.SubscriptionPlan, erp_models.TenantSubscription.plan_id == erp_models.SubscriptionPlan.id
    )
    if organization_id:
        q = q.filter(erp_models.TenantSubscription.organization_id == organization_id)
    rows = q.all()
    return {"subscriptions": [{"id": s.id, "organization_id": s.organization_id, "plan_id": s.plan_id, "plan_name": p.name, "status": s.status, "started_at": s.started_at.isoformat()[:10] if s.started_at else None, "ends_at": s.ends_at.isoformat()[:10] if s.ends_at else None} for s, p in rows]}


@router.post("/api/saas/subscriptions")
def create_subscription(
    body: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    org_id = body.get("organization_id")
    plan_id = body.get("plan_id")
    if not org_id or not plan_id:
        raise HTTPException(status_code=400, detail="organization_id and plan_id required")
    started = datetime.utcnow()
    sub = erp_models.TenantSubscription(organization_id=org_id, plan_id=plan_id, status="active", started_at=started)
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return {"id": sub.id, "status": sub.status}


# --- Feature toggles per tenant ---

@router.get("/api/saas/feature-toggles")
def list_feature_toggles(
    organization_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    toggles = db.query(erp_models.TenantFeatureToggle).filter(erp_models.TenantFeatureToggle.organization_id == organization_id).all()
    return {"toggles": [{"feature_code": t.feature_code, "enabled": t.enabled} for t in toggles]}


@router.post("/api/saas/feature-toggles")
def set_feature_toggle(
  body: dict,
  db: Session = Depends(get_db),
  current_user: models.User = Depends(get_current_user),
):
    org_id = body.get("organization_id")
    feature_code = body.get("feature_code")
    enabled = body.get("enabled", True)
    if not org_id or not feature_code:
        raise HTTPException(status_code=400, detail="organization_id and feature_code required")
    t = db.query(erp_models.TenantFeatureToggle).filter(
        erp_models.TenantFeatureToggle.organization_id == org_id,
        erp_models.TenantFeatureToggle.feature_code == feature_code,
    ).first()
    if t:
        t.enabled = enabled
    else:
        t = erp_models.TenantFeatureToggle(organization_id=org_id, feature_code=feature_code, enabled=enabled)
        db.add(t)
    db.commit()
    return {"feature_code": feature_code, "enabled": enabled}


# --- Usage limits / usage log ---

@router.get("/api/saas/usage")
def get_usage(
    organization_id: int = Query(...),
    metric: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(erp_models.UsageLog).filter(erp_models.UsageLog.organization_id == organization_id)
    if metric:
        q = q.filter(erp_models.UsageLog.metric == metric)
    logs = q.order_by(erp_models.UsageLog.created_at.desc()).limit(100).all()
    return {"usage": [{"metric": l.metric, "value": float(l.value), "period_start": l.period_start.isoformat()[:10] if l.period_start else None, "created_at": l.created_at.isoformat()[:19] if l.created_at else None} for l in logs]}


@router.post("/api/saas/usage")
def record_usage(
  body: dict,
  db: Session = Depends(get_db),
  current_user: models.User = Depends(get_current_user),
):
    org_id = body.get("organization_id")
    metric = body.get("metric")
    value = body.get("value", 0)
    if not org_id or not metric:
        raise HTTPException(status_code=400, detail="organization_id and metric required")
    u = erp_models.UsageLog(organization_id=org_id, metric=metric, value=Decimal(str(value)))
    db.add(u)
    db.commit()
    return {"recorded": True}


# --- Backup strategy: export key data as JSON ---

@router.get("/api/saas/backup/export")
def backup_export(
    tenant_id: int = Query(1),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    data = {
        "exported_at": datetime.utcnow().isoformat(),
        "tenant_id": tenant_id,
        "organizations": [{"id": o.id, "name": o.name, "slug": o.slug} for o in db.query(erp_models.Organization).all()],
        "users": [{"id": u.id, "username": u.username, "name": u.name, "role": u.role} for u in db.query(models.User).all()],
        "products_count": db.query(func.count(models.Product.id)).scalar() or 0,
        "customers_count": db.query(func.count(models.Customer.id)).scalar() or 0,
        "orders_count": db.query(func.count(models.Order.id)).scalar() or 0,
    }
    buf = io.BytesIO(json.dumps(data, indent=2).encode("utf-8"))
    return StreamingResponse(
        buf,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=erp-backup.json"},
    )


@router.get("/api/saas/backup/strategy")
def backup_strategy():
    """Returns backup strategy documentation."""
    return {
        "strategy": "Manual export via /api/saas/backup/export (admin only). For production: schedule daily DB dumps (pg_dump or SQLite backup), retain 30 days, store offsite.",
        "endpoints": ["GET /api/saas/backup/export?tenant_id=1 - export metadata JSON"],
    }
