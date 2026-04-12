"""Customer–product approved rate master for GST estimates (validity + last updated)."""
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from ..db.database import get_db
from ..models import models
from .auth import get_current_user
from .customers import _customer_to_response

router = APIRouter()


def _safe_float(v: Any) -> float:
    if v is None:
        return 0.0
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def _as_date(val: Any) -> Optional[date]:
    if val is None:
        return None
    if isinstance(val, date) and not isinstance(val, datetime):
        return val
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, str) and val.strip():
        try:
            return date.fromisoformat(val.strip()[:10])
        except ValueError:
            return None
    return None


def _rate_row_valid_on(row: models.CustomerApprovedRate, on: date) -> bool:
    vf = _as_date(getattr(row, "valid_from", None))
    vt = _as_date(getattr(row, "valid_to", None))
    if vf and on < vf:
        return False
    if vt and on > vt:
        return False
    return True


def _serialize_rate(row: models.CustomerApprovedRate) -> dict[str, Any]:
    c = row.customer
    p = row.product
    return {
        "id": row.id,
        "customerId": row.customer_id,
        "productId": row.product_id,
        "customerName": (c.name or c.company or c.contact_person or f"#{row.customer_id}") if c else "",
        "productName": (p.name or p.sku or f"#{row.product_id}") if p else "",
        "productSku": (p.sku or "") if p else "",
        "productUnit": (p.unit or "") if p else "",
        "approvedRate": _safe_float(row.approved_rate),
        "gstPercent": _safe_float(row.gst_percent) if row.gst_percent is not None else None,
        "validFrom": vf.isoformat() if (vf := _as_date(row.valid_from)) else None,
        "validTo": vt.isoformat() if (vt := _as_date(row.valid_to)) else None,
        "remarks": row.remarks or "",
        "lastUpdated": row.updated_at.isoformat() if row.updated_at else None,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
    }


@router.get("/api/customer-approved-rates")
def list_customer_approved_rates(
    customer_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = (
        db.query(models.CustomerApprovedRate)
        .options(joinedload(models.CustomerApprovedRate.customer), joinedload(models.CustomerApprovedRate.product))
        .order_by(models.CustomerApprovedRate.customer_id, models.CustomerApprovedRate.product_id)
    )
    if customer_id is not None:
        q = q.filter(models.CustomerApprovedRate.customer_id == customer_id)
    rows = q.all()
    return {"items": [_serialize_rate(r) for r in rows]}


@router.get("/api/customer-approved-rates/for-estimate")
def rates_for_estimate(
    customer_id: int = Query(...),
    as_of: Optional[str] = Query(None, description="YYYY-MM-DD; default today"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Valid approved rates for one customer on a date (for filling estimate lines)."""
    cust = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not cust:
        raise HTTPException(404, "Customer not found")
    d = _as_date(as_of) or date.today()
    rows = (
        db.query(models.CustomerApprovedRate)
        .options(joinedload(models.CustomerApprovedRate.product))
        .filter(models.CustomerApprovedRate.customer_id == customer_id)
        .all()
    )
    items: list[dict[str, Any]] = []
    for r in rows:
        if not _rate_row_valid_on(r, d):
            continue
        p = r.product
        gst = _safe_float(r.gst_percent) if r.gst_percent is not None else 18.0
        items.append(
            {
                "rateId": r.id,
                "productId": r.product_id,
                "itemName": (p.name or p.sku or f"Product #{r.product_id}") if p else "",
                "uom": (p.unit or "") if p else "",
                "unitPrice": _safe_float(r.approved_rate),
                "gstPercent": gst,
                "validFrom": vf.isoformat() if (vf := _as_date(r.valid_from)) else None,
                "validTo": vt.isoformat() if (vt := _as_date(r.valid_to)) else None,
                "lastUpdated": r.updated_at.isoformat() if r.updated_at else None,
            }
        )
    return {"asOf": d.isoformat(), "customerId": customer_id, "customer": _customer_to_response(cust), "items": items}


@router.post("/api/customer-approved-rates")
def create_customer_approved_rate(
    body: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    cid = body.get("customerId") or body.get("customer_id")
    pid = body.get("productId") or body.get("product_id")
    if cid is None or pid is None:
        raise HTTPException(400, "customerId and productId are required")
    try:
        cid = int(cid)
        pid = int(pid)
    except (TypeError, ValueError):
        raise HTTPException(400, "customerId and productId must be integers")
    rate_val = body.get("approvedRate") if body.get("approvedRate") is not None else body.get("approved_rate")
    if rate_val is None:
        raise HTTPException(400, "approvedRate is required")
    try:
        approved = Decimal(str(rate_val))
    except Exception:
        raise HTTPException(400, "approvedRate must be a number")
    if approved < 0:
        raise HTTPException(400, "approvedRate cannot be negative")

    if not db.query(models.Customer).filter(models.Customer.id == cid).first():
        raise HTTPException(404, "Customer not found")
    if not db.query(models.Product).filter(models.Product.id == pid).first():
        raise HTTPException(404, "Product not found")

    dup = (
        db.query(models.CustomerApprovedRate)
        .filter(models.CustomerApprovedRate.customer_id == cid, models.CustomerApprovedRate.product_id == pid)
        .first()
    )
    if dup:
        raise HTTPException(409, "A rate for this customer and product already exists. Use PATCH to update.")

    gst_raw = body.get("gstPercent") if body.get("gstPercent") is not None else body.get("gst_percent")
    gst = None
    if gst_raw is not None and str(gst_raw).strip() != "":
        try:
            gst = Decimal(str(gst_raw))
        except Exception:
            raise HTTPException(400, "gstPercent must be a number")

    rem = body.get("remarks")
    row = models.CustomerApprovedRate(
        customer_id=cid,
        product_id=pid,
        approved_rate=approved,
        gst_percent=gst,
        valid_from=_as_date(body.get("validFrom") or body.get("valid_from")),
        valid_to=_as_date(body.get("validTo") or body.get("valid_to")),
        remarks=(str(rem).strip() or None) if rem is not None else None,
    )
    vf, vt = _as_date(row.valid_from), _as_date(row.valid_to)
    if vf and vt and vf > vt:
        raise HTTPException(400, "validFrom must be on or before validTo")

    db.add(row)
    db.commit()
    db.refresh(row)
    row = (
        db.query(models.CustomerApprovedRate)
        .options(joinedload(models.CustomerApprovedRate.customer), joinedload(models.CustomerApprovedRate.product))
        .filter(models.CustomerApprovedRate.id == row.id)
        .first()
    )
    return _serialize_rate(row)


@router.patch("/api/customer-approved-rates/{rate_id}")
def update_customer_approved_rate(
    rate_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    row = (
        db.query(models.CustomerApprovedRate)
        .options(joinedload(models.CustomerApprovedRate.customer), joinedload(models.CustomerApprovedRate.product))
        .filter(models.CustomerApprovedRate.id == rate_id)
        .first()
    )
    if not row:
        raise HTTPException(404, "Rate not found")

    if "approvedRate" in body or "approved_rate" in body:
        raw = body.get("approvedRate") if "approvedRate" in body else body.get("approved_rate")
        try:
            approved = Decimal(str(raw))
        except Exception:
            raise HTTPException(400, "approvedRate must be a number")
        if approved < 0:
            raise HTTPException(400, "approvedRate cannot be negative")
        row.approved_rate = approved

    if "gstPercent" in body or "gst_percent" in body:
        raw = body.get("gstPercent") if "gstPercent" in body else body.get("gst_percent")
        if raw is None or str(raw).strip() == "":
            row.gst_percent = None
        else:
            try:
                row.gst_percent = Decimal(str(raw))
            except Exception:
                raise HTTPException(400, "gstPercent must be a number")

    if "validFrom" in body or "valid_from" in body:
        row.valid_from = _as_date(body.get("validFrom") if "validFrom" in body else body.get("valid_from"))
    if "validTo" in body or "valid_to" in body:
        row.valid_to = _as_date(body.get("validTo") if "validTo" in body else body.get("valid_to"))

    if "remarks" in body:
        r = body.get("remarks")
        row.remarks = (str(r).strip() or None) if r is not None else None

    vf, vt = _as_date(row.valid_from), _as_date(row.valid_to)
    if vf and vt and vf > vt:
        raise HTTPException(400, "validFrom must be on or before validTo")

    db.commit()
    db.refresh(row)
    row = (
        db.query(models.CustomerApprovedRate)
        .options(joinedload(models.CustomerApprovedRate.customer), joinedload(models.CustomerApprovedRate.product))
        .filter(models.CustomerApprovedRate.id == rate_id)
        .first()
    )
    return _serialize_rate(row)


@router.delete("/api/customer-approved-rates/{rate_id}")
def delete_customer_approved_rate(
    rate_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    row = db.query(models.CustomerApprovedRate).filter(models.CustomerApprovedRate.id == rate_id).first()
    if not row:
        raise HTTPException(404, "Rate not found")
    db.delete(row)
    db.commit()
    return {"status": "ok"}
