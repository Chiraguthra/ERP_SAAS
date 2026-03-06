import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from typing import List, Optional, Union
from pydantic import BaseModel, ConfigDict, field_validator
from ..db.database import get_db
from ..models import models
from .auth import get_current_user

router = APIRouter()


class ProductCreate(BaseModel):
    """Request body for creating a product; all fields optional."""
    name: Optional[str] = ""
    description: Optional[str] = None
    sku: Optional[str] = None
    price: Optional[Union[str, int, float]] = 0.0
    stock: Optional[Union[str, int, float]] = 0.0
    unit: Optional[str] = None

    @field_validator("price", "stock", mode="before")
    @classmethod
    def coerce_number(cls, v):
        if v is None or v == "":
            return 0.0
        try:
            return float(v)
        except (TypeError, ValueError):
            return 0.0


class ProductBase(BaseModel):
    name: Optional[str] = ""
    description: Optional[str] = None
    sku: Optional[str] = None
    price: Optional[float] = 0.0
    stock: Optional[float] = 0.0
    unit: Optional[str] = None

class ProductResponse(ProductBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


def _product_create_to_model(product: ProductCreate) -> dict:
    """Convert ProductCreate to DB model kwargs."""
    name = (product.name or "").strip() or ""
    sku = (product.sku or "").strip() or None
    if not sku:
        sku = f"SKU-{uuid.uuid4().hex[:8]}"
    price = product.price if isinstance(product.price, (int, float)) else float(product.price or 0)
    stock = product.stock if isinstance(product.stock, (int, float)) else float(product.stock or 0)
    description = (product.description or "").strip() or None
    unit = (product.unit or "").strip() or None
    return {
        "name": name,
        "sku": sku,
        "price": price,
        "stock": stock,
        "description": description,
        "unit": unit,
    }


def _product_to_response(p: models.Product) -> dict:
    """Serialize a product row so manually inserted rows (NULLs, different types) still show on frontend."""
    price_val = p.price
    if price_val is None:
        price_val = 0.0
    else:
        try:
            price_val = float(price_val)
        except (TypeError, ValueError):
            price_val = 0.0
    stock_val = p.stock
    if stock_val is None:
        stock_val = 0.0
    else:
        try:
            stock_val = float(stock_val)
        except (TypeError, ValueError):
            stock_val = 0.0
    return {
        "id": p.id,
        "name": p.name or "",
        "description": p.description if p.description is not None else None,
        "sku": p.sku or "",
        "price": price_val,
        "stock": stock_val,
        "unit": p.unit if p.unit is not None else None,
    }


@router.get("/products")
def list_products(
    q: Optional[str] = Query(default=None),
    limit: int = Query(default=25, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Product)
    if q:
        q_like = f"%{q.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(func.coalesce(models.Product.name, "")).like(q_like),
                func.lower(func.coalesce(models.Product.sku, "")).like(q_like),
            )
        )
    total = query.order_by(None).count()
    rows = query.order_by(models.Product.id.desc()).offset(offset).limit(limit).all()
    return {
        "items": [_product_to_response(p) for p in rows],
        "total": int(total),
        "offset": int(offset),
        "limit": int(limit),
    }

@router.post("/products")
def create_product(product: ProductCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    data = _product_create_to_model(product)
    db_product = models.Product(**data)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return _product_to_response(db_product)

class ProductUpdate(BaseModel):
    """Partial update; all fields optional."""
    name: Optional[str] = None
    description: Optional[str] = None
    sku: Optional[str] = None
    price: Optional[Union[str, int, float]] = None
    stock: Optional[Union[str, int, float]] = None
    unit: Optional[str] = None


@router.patch("/products/{id}")
def update_product(id: int, product: ProductUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_product = db.query(models.Product).filter(models.Product.id == id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    data = product.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        db_product.name = (data["name"] or "").strip() or None
    if "description" in data:
        db_product.description = (data["description"] or "").strip() or None
    if "sku" in data and data["sku"] is not None:
        v = (data["sku"] or "").strip()
        db_product.sku = v if v else (db_product.sku or f"SKU-{uuid.uuid4().hex[:8]}")
    if "price" in data and data["price"] is not None:
        try:
            db_product.price = float(data["price"])
        except (TypeError, ValueError):
            pass
    if "stock" in data and data["stock"] is not None:
        try:
            db_product.stock = float(data["stock"])
        except (TypeError, ValueError):
            pass
    if "unit" in data:
        v = (data["unit"] or "").strip()
        db_product.unit = v if v else None
    db.commit()
    db.refresh(db_product)
    return _product_to_response(db_product)

@router.delete("/products/{id}")
def delete_product(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_product = db.query(models.Product).filter(models.Product.id == id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(db_product)
    db.commit()
    return {"status": "success"}
