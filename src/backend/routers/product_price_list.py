from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..models import models
from .auth import get_current_user


router = APIRouter()


@router.get("/api/product-price-list")
def list_product_prices(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    rows: List[models.ProductPriceListItem] = (
        db.query(models.ProductPriceListItem)
        .order_by(models.ProductPriceListItem.product_name.asc())
        .all()
    )
    return [
        {
            "id": row.id,
            "product_name": row.product_name,
            "first_price": float(row.first_price),
            "final_price": float(row.final_price),
        }
        for row in rows
    ]


@router.post("/api/product-price-list")
def create_product_price(
    body: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    name = (body.get("product_name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Product name is required.")
    try:
        first_price_val = float(body.get("first_price"))
        final_price_val = float(body.get("final_price"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="First and final price must be numbers.")

    existing = (
        db.query(models.ProductPriceListItem)
        .filter(models.ProductPriceListItem.product_name == name)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Product with this name already exists.")

    item = models.ProductPriceListItem(
        product_name=name,
        first_price=first_price_val,
        final_price=final_price_val,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {
        "id": item.id,
        "product_name": item.product_name,
        "first_price": float(item.first_price),
        "final_price": float(item.final_price),
    }


@router.patch("/api/product-price-list/{item_id}")
def update_product_price(
    item_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.ProductPriceListItem)
        .filter(models.ProductPriceListItem.id == item_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Product price not found.")

    if "product_name" in body:
        name = (body.get("product_name") or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="Product name cannot be empty.")
        # Ensure unique name if changed
        existing = (
            db.query(models.ProductPriceListItem)
            .filter(
                models.ProductPriceListItem.product_name == name,
                models.ProductPriceListItem.id != item.id,
            )
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="Another product with this name already exists.")
        item.product_name = name

    if "first_price" in body:
        try:
            item.first_price = float(body.get("first_price"))
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="First price must be a number.")

    if "final_price" in body:
        try:
            item.final_price = float(body.get("final_price"))
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Final price must be a number.")

    db.commit()
    db.refresh(item)
    return {
        "id": item.id,
        "product_name": item.product_name,
        "first_price": float(item.first_price),
        "final_price": float(item.final_price),
    }

