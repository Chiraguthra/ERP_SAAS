"""Retailer (business) details - single row; used as 'From' on order print."""
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from ..db.database import get_db
from ..models import models
from .auth import get_current_user

router = APIRouter()


class RetailerResponse(BaseModel):
    id: int
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pinCode: Optional[str] = None
    country: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None


def _row_to_response(r: models.Retailer) -> dict:
    if r is None:
        return {}
    return {
        "id": r.id,
        "name": (r.name or "").strip() or None,
        "address": (r.address or "").strip() or None,
        "city": (r.city or "").strip() or None,
        "state": (r.state or "").strip() or None,
        "pinCode": (r.pin_code or "").strip() if r.pin_code is not None else None,
        "country": (r.country or "").strip() or None,
        "gstin": (r.gstin or "").strip() or None,
        "pan": (r.pan or "").strip() or None,
    }


@router.get("/retailer")
def get_retailer(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Get the single retailer record (first row). Returns empty object if none."""
    row = db.query(models.Retailer).first()
    if not row:
        return _row_to_response(None)
    return _row_to_response(row)


@router.put("/retailer")
def upsert_retailer(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create or update the single retailer. Keys: name, address, city, state, pinCode, country, gstin, pan (camelCase)."""
    row = db.query(models.Retailer).first()
    data = {}
    key_map = {"pinCode": "pin_code"}
    for k, v in payload.items():
        attr = key_map.get(k, k)
        if not hasattr(models.Retailer, attr):
            continue
        if v is None:
            data[attr] = None
        elif isinstance(v, str):
            data[attr] = v.strip() or None
        else:
            data[attr] = str(v).strip() if v else None

    if not row:
        row = models.Retailer(**data)
        db.add(row)
    else:
        for key, value in data.items():
            setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return _row_to_response(row)
