"""Inventory: Warehouses, Stock In/Out, Stock valuation, Reorder alerts, Stock reports."""
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

from ..db.database import get_db
from ..models import models
from ..models import erp_models
from .auth import get_current_user

router = APIRouter()
TENANT_DEFAULT = 1


# --- Warehouses ---

class WarehouseCreate(BaseModel):
    name: str
    code: Optional[str] = None
    address: Optional[str] = None


@router.get("/api/warehouses")
def list_warehouses(
    tenant_id: int = Query(TENANT_DEFAULT),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    w = db.query(erp_models.Warehouse).filter(erp_models.Warehouse.tenant_id == tenant_id).all()
    return {"warehouses": [{"id": x.id, "name": x.name, "code": x.code, "address": x.address} for x in w]}


@router.post("/api/warehouses")
def create_warehouse(
    body: WarehouseCreate,
    tenant_id: int = TENANT_DEFAULT,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    w = erp_models.Warehouse(tenant_id=tenant_id, name=body.name, code=body.code, address=body.address)
    db.add(w)
    db.commit()
    db.refresh(w)
    return {"id": w.id, "name": w.name}


# --- Stock movements ---

class StockMovementCreate(BaseModel):
    warehouse_id: int
    product_id: int
    type: str  # in, out, adjustment
    quantity: float
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    unit_cost: Optional[float] = None


@router.get("/api/stock-movements")
def list_stock_movements(
    tenant_id: int = Query(TENANT_DEFAULT),
    warehouse_id: Optional[int] = None,
    product_id: Optional[int] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(erp_models.StockMovement).filter(erp_models.StockMovement.tenant_id == tenant_id)
    if warehouse_id:
        q = q.filter(erp_models.StockMovement.warehouse_id == warehouse_id)
    if product_id:
        q = q.filter(erp_models.StockMovement.product_id == product_id)
    if from_date:
        q = q.filter(erp_models.StockMovement.date >= from_date)
    if to_date:
        q = q.filter(erp_models.StockMovement.date <= to_date)
    moves = q.order_by(erp_models.StockMovement.date.desc()).limit(200).all()
    return {"movements": [{"id": m.id, "warehouse_id": m.warehouse_id, "product_id": m.product_id, "type": m.type, "quantity": float(m.quantity), "date": m.date.isoformat()[:10] if m.date else None, "reference_type": m.reference_type, "reference_id": m.reference_id, "unit_cost": float(m.unit_cost) if m.unit_cost else None} for m in moves]}


@router.post("/api/stock-movements")
def create_stock_movement(
    body: StockMovementCreate,
    tenant_id: int = TENANT_DEFAULT,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    qty = body.quantity if body.type in ("in", "adjustment") else -body.quantity
    if body.type == "out" and body.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity for out must be positive")
    m = erp_models.StockMovement(
        tenant_id=tenant_id,
        warehouse_id=body.warehouse_id,
        product_id=body.product_id,
        type=body.type,
        quantity=qty,
        reference_type=body.reference_type,
        reference_id=body.reference_id,
        date=datetime.utcnow(),
        unit_cost=Decimal(str(body.unit_cost)) if body.unit_cost is not None else None,
    )
    db.add(m)
    # Update product stock (single warehouse mode: product.stock)
    prod = db.query(models.Product).filter(models.Product.id == body.product_id).first()
    if prod is not None:
        prod.stock = (float(prod.stock or 0) + qty)
    db.commit()
    db.refresh(m)
    return {"id": m.id, "type": m.type, "quantity": float(m.quantity)}


# --- Stock valuation (simple: current stock * last cost or product price) ---

@router.get("/api/inventory/valuation")
def stock_valuation(
    tenant_id: int = Query(TENANT_DEFAULT),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    products = db.query(models.Product).all()
    out = []
    total_val = 0
    for p in products:
        qty = float(p.stock or 0)
        cost = float(p.price or 0)  # simplified: use selling price as proxy if no cost
        val = qty * cost
        total_val += val
        out.append({"product_id": p.id, "name": p.name, "sku": p.sku, "quantity": qty, "unit_cost": cost, "value": val})
    return {"items": out, "total_value": total_val}


# --- Reorder alerts ---

@router.get("/api/inventory/reorder-alerts")
def reorder_alerts(
    tenant_id: int = Query(TENANT_DEFAULT),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Products where stock <= reorder_level (and reorder_level is set)
    products = db.query(models.Product).filter(
        models.Product.reorder_level.isnot(None),
        models.Product.stock <= models.Product.reorder_level,
    ).all()
    return {"alerts": [{"product_id": p.id, "name": p.name, "sku": p.sku, "stock": float(p.stock or 0), "reorder_level": float(p.reorder_level or 0)} for p in products]}


# --- Stock report ---

@router.get("/api/inventory/stock-report")
def stock_report(
    tenant_id: int = Query(TENANT_DEFAULT),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    products = db.query(models.Product).order_by(models.Product.name).all()
    return {"products": [{"id": p.id, "name": p.name, "sku": p.sku, "stock": float(p.stock or 0), "unit": p.unit, "reorder_level": float(p.reorder_level) if p.reorder_level else None} for p in products]}
