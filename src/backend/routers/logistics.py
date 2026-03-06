"""Logistics: Record and track logistics entries with dashboard analytics."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

from ..db.database import get_db
from ..models import models
from ..models import erp_models
from .auth import get_current_user

router = APIRouter()
TENANT_DEFAULT = 1


class LogisticsCreate(BaseModel):
    order_id: Optional[int] = None
    product_name: str
    product_unit: Optional[str] = None
    quantity: Optional[float] = None
    distance: Optional[float] = None
    date: str  # YYYY-MM-DD or ISO


class LogisticsUpdate(BaseModel):
    order_id: Optional[int] = None
    product_name: Optional[str] = None
    product_unit: Optional[str] = None
    quantity: Optional[float] = None
    distance: Optional[float] = None
    date: Optional[str] = None


class LogisticsResponse(BaseModel):
    id: int
    order_id: Optional[int]
    product_name: str
    product_unit: Optional[str]
    quantity: Optional[float]
    distance: Optional[float]
    date: str
    created_by: Optional[str]
    created_at: Optional[str]

    class Config:
        from_attributes = True


def _parse_date(d: str) -> datetime:
    if "T" in d:
        return datetime.fromisoformat(d.replace("Z", "+00:00"))
    return datetime.strptime(d, "%Y-%m-%d")


def _to_response(log: erp_models.Logistics) -> dict:
    return {
        "id": log.id,
        "order_id": log.order_id,
        "product_name": log.product_name,
        "product_unit": log.product_unit,
        "quantity": float(log.quantity) if log.quantity is not None else None,
        "distance": float(log.distance) if log.distance is not None else None,
        "date": log.date.isoformat()[:10] if log.date else None,
        "created_by": log.created_by,
        "created_at": log.created_at.isoformat() if log.created_at else None,
    }


@router.get("/api/logistics")
def list_logistics(
    tenant_id: int = Query(TENANT_DEFAULT),
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    product_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(erp_models.Logistics).filter(erp_models.Logistics.tenant_id == tenant_id)
    if from_date:
        q = q.filter(erp_models.Logistics.date >= from_date)
    if to_date:
        q = q.filter(erp_models.Logistics.date <= to_date)
    if product_name:
        q = q.filter(erp_models.Logistics.product_name.ilike(f"%{product_name}%"))
    rows = q.order_by(erp_models.Logistics.date.desc()).limit(500).all()
    return {"logistics": [_to_response(r) for r in rows]}


@router.get("/api/logistics/{log_id}")
def get_logistics(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    log = db.query(erp_models.Logistics).filter(erp_models.Logistics.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Logistics entry not found")
    return _to_response(log)


@router.post("/api/logistics")
def create_logistics(
    body: LogisticsCreate,
    tenant_id: int = TENANT_DEFAULT,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    log = erp_models.Logistics(
        tenant_id=tenant_id,
        order_id=body.order_id,
        product_name=body.product_name,
        product_unit=body.product_unit,
        quantity=body.quantity,
        distance=body.distance,
        date=_parse_date(body.date),
        created_by=current_user.name or current_user.username,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return _to_response(log)


@router.patch("/api/logistics/{log_id}")
def update_logistics(
    log_id: int,
    body: LogisticsUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    log = db.query(erp_models.Logistics).filter(erp_models.Logistics.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Logistics entry not found")
    if body.order_id is not None:
        log.order_id = body.order_id
    if body.product_name is not None:
        log.product_name = body.product_name
    if body.product_unit is not None:
        log.product_unit = body.product_unit
    if body.quantity is not None:
        log.quantity = body.quantity
    if body.distance is not None:
        log.distance = body.distance
    if body.date is not None:
        log.date = _parse_date(body.date)
    db.commit()
    db.refresh(log)
    return _to_response(log)


@router.delete("/api/logistics/{log_id}", status_code=204)
def delete_logistics(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    log = db.query(erp_models.Logistics).filter(erp_models.Logistics.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Logistics entry not found")
    db.delete(log)
    db.commit()
    return None


# --- Dashboard / Analytics ---

@router.get("/api/logistics/dashboard/summary")
def logistics_dashboard(
    tenant_id: int = Query(TENANT_DEFAULT),
    year: Optional[int] = None,
    month: Optional[int] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Aggregate summary by month, product, and distance - with quantity aggregations.
    
    Filters:
    - year + month: filter to specific month
    - from_date + to_date: filter to date range (YYYY-MM-DD)
    """
    # Build base filter
    def apply_filters(q):
        q = q.filter(erp_models.Logistics.tenant_id == tenant_id)
        if from_date:
            q = q.filter(erp_models.Logistics.date >= from_date)
        if to_date:
            q = q.filter(erp_models.Logistics.date <= to_date)
        if year and not from_date and not to_date:
            q = q.filter(extract("year", erp_models.Logistics.date) == year)
            if month:
                q = q.filter(extract("month", erp_models.Logistics.date) == month)
        return q

    # Total entries, distance, and quantity (with filters)
    totals_q = apply_filters(
        db.query(
            func.count(erp_models.Logistics.id),
            func.sum(erp_models.Logistics.distance),
            func.sum(erp_models.Logistics.quantity),
        )
    )
    totals = totals_q.first()
    total_entries = totals[0] or 0
    total_distance = float(totals[1] or 0)
    total_quantity = float(totals[2] or 0)

    # By month (with quantity) - always show all months, no date filter here
    by_month_q = (
        db.query(
            extract("year", erp_models.Logistics.date).label("year"),
            extract("month", erp_models.Logistics.date).label("month"),
            func.count(erp_models.Logistics.id).label("count"),
            func.sum(erp_models.Logistics.distance).label("total_distance"),
            func.sum(erp_models.Logistics.quantity).label("total_quantity"),
        )
        .filter(erp_models.Logistics.tenant_id == tenant_id)
        .group_by(
            extract("year", erp_models.Logistics.date),
            extract("month", erp_models.Logistics.date),
        )
        .order_by(
            extract("year", erp_models.Logistics.date).desc(),
            extract("month", erp_models.Logistics.date).desc(),
        )
        .limit(24)
    )
    by_month = [
        {
            "year": int(r.year),
            "month": int(r.month),
            "count": r.count,
            "total_distance": float(r.total_distance or 0),
            "total_quantity": float(r.total_quantity or 0),
        }
        for r in by_month_q.all()
    ]

    # By product (with quantity) - apply date filters
    by_product_q = apply_filters(
        db.query(
            erp_models.Logistics.product_name,
            erp_models.Logistics.product_unit,
            func.count(erp_models.Logistics.id).label("count"),
            func.sum(erp_models.Logistics.distance).label("total_distance"),
            func.sum(erp_models.Logistics.quantity).label("total_quantity"),
        )
    ).group_by(
        erp_models.Logistics.product_name,
        erp_models.Logistics.product_unit,
    ).order_by(func.sum(erp_models.Logistics.quantity).desc())
    
    by_product = by_product_q.all()
    products_summary = [
        {
            "product_name": r.product_name,
            "product_unit": r.product_unit or "",
            "count": r.count,
            "total_distance": float(r.total_distance or 0),
            "total_quantity": float(r.total_quantity or 0),
        }
        for r in by_product
    ]

    # Distance ranges (buckets) - apply date filters
    distance_buckets = [
        {"range": "0-50", "min": 0, "max": 50},
        {"range": "50-100", "min": 50, "max": 100},
        {"range": "100-200", "min": 100, "max": 200},
        {"range": "200-500", "min": 200, "max": 500},
        {"range": "500+", "min": 500, "max": 999999},
    ]
    by_distance = []
    for bucket in distance_buckets:
        bucket_q = apply_filters(
            db.query(
                func.count(erp_models.Logistics.id),
                func.sum(erp_models.Logistics.quantity),
            )
        ).filter(
            erp_models.Logistics.distance >= bucket["min"]
        ).filter(
            erp_models.Logistics.distance < bucket["max"]
        )
        row = bucket_q.first()
        by_distance.append({
            "range": bucket["range"],
            "count": row[0] or 0,
            "total_quantity": float(row[1] or 0),
        })

    return {
        "total_entries": total_entries,
        "total_distance": total_distance,
        "total_quantity": total_quantity,
        "by_month": by_month,
        "by_product": products_summary,
        "by_distance": by_distance,
    }
