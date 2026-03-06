from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import cast, String, func, or_
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Union
from datetime import datetime
import math
from pydantic import BaseModel
from ..db.database import get_db
from ..models import models
from .auth import get_current_user
from .customers import _customer_to_response

router = APIRouter()

class OrderItemBase(BaseModel):
    productId: int
    quantity: int
    price: Optional[float] = None  # rate per unit; if omitted, use product price

class OrderCreate(BaseModel):
    customerId: int
    items: List[OrderItemBase]
    status: str = "pending"
    billId: Optional[str] = None
    freightCharges: Optional[float] = None
    adjustments: Optional[float] = None
    cgstPercent: Optional[float] = None
    sgstPercent: Optional[float] = None
    igstPercent: Optional[float] = None
    deliveryNote: Optional[str] = None
    referenceNo: Optional[str] = None
    buyersOrderNo: Optional[str] = None
    dispatchDocNo: Optional[str] = None
    dispatchedThrough: Optional[str] = None
    modeTermsOfPayment: Optional[str] = None
    otherReferences: Optional[str] = None
    deliveryNoteDate: Optional[Union[datetime, str]] = None
    destination: Optional[str] = None
    termsOfDelivery: Optional[str] = None
    contactNumber: Optional[str] = None


def _customer_dict(c):
    """Serialize customer for order responses; uses full customer schema."""
    return _customer_to_response(c)


def _safe_float(val, default=0.0):
    if val is None:
        return default
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def _round_total(val):
    """Round total: if decimal part < 0.5 round down, else round up (no decimal places)."""
    if val is None:
        return 0.0
    v = float(val)
    frac = v - math.floor(v)
    return math.floor(v) if frac < 0.5 else math.ceil(v)


def _order_item_to_response(item):
    """Serialize order item so CSV-inserted rows (NULLs, missing product) still work."""
    price_val = _safe_float(item.price)
    prod = item.product
    if prod is None:
        product_payload = {"id": item.product_id, "name": "", "sku": "", "price": price_val, "stock": 0.0, "description": None, "unit": None}
    else:
        product_payload = {
            "id": prod.id,
            "name": prod.name or "",
            "description": prod.description if prod.description is not None else None,
            "sku": prod.sku or "",
            "price": _safe_float(prod.price),
            "stock": float(prod.stock) if prod.stock is not None else 0.0,
            "unit": prod.unit if prod.unit is not None else None,
        }
    return {
        "id": item.id,
        "orderId": item.order_id,
        "productId": item.product_id,
        "quantity": int(item.quantity) if item.quantity is not None else 0,
        "price": price_val,
        "product": product_payload,
    }


def _parse_date(val):
    if val is None:
        return None
    if hasattr(val, "isoformat"):
        return val.isoformat()
    return str(val) if val else None


def _order_to_response(o):
    """Serialize order for list and get; includes freight, adjustments, GST percents and reference fields."""
    out = {
        "id": o.id,
        "billId": o.bill_id if o.bill_id is not None else None,
        "customerId": o.customer_id,
        "status": (o.status or "").strip() or "pending",
        "totalAmount": _safe_float(o.total_amount),
        "createdAt": o.created_at.isoformat() if o.created_at else None,
        "updatedAt": o.updated_at.isoformat() if o.updated_at else None,
        "freightCharges": _safe_float(o.freight_charges) if getattr(o, "freight_charges", None) is not None else 0,
        "adjustments": _safe_float(o.adjustments) if getattr(o, "adjustments", None) is not None else 0,
        "cgstPercent": _safe_float(o.cgst_percent) if getattr(o, "cgst_percent", None) is not None else None,
        "sgstPercent": _safe_float(o.sgst_percent) if getattr(o, "sgst_percent", None) is not None else None,
        "igstPercent": _safe_float(o.igst_percent) if getattr(o, "igst_percent", None) is not None else None,
        "customer": _customer_dict(o.customer),
    }
    for attr, key in [
        ("delivery_note", "deliveryNote"),
        ("reference_no", "referenceNo"),
        ("buyers_order_no", "buyersOrderNo"),
        ("dispatch_doc_no", "dispatchDocNo"),
        ("dispatched_through", "dispatchedThrough"),
        ("mode_terms_of_payment", "modeTermsOfPayment"),
        ("other_references", "otherReferences"),
        ("destination", "destination"),
        ("terms_of_delivery", "termsOfDelivery"),
        ("contact_number", "contactNumber"),
    ]:
        v = getattr(o, attr, None)
        out[key] = (v.strip() if v and isinstance(v, str) else v) or None
    out["deliveryNoteDate"] = _parse_date(getattr(o, "delivery_note_date", None))
    return out


@router.get("/orders")
def list_orders(
    q: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    limit: int = Query(default=25, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = (
        db.query(models.Order)
        .options(joinedload(models.Order.customer))
        .outerjoin(models.Customer, models.Order.customer_id == models.Customer.id)
    )
    if status:
        query = query.filter(func.lower(models.Order.status) == status.strip().lower())
    if q:
        q_raw = q.strip()
        q_like = f"%{q_raw.lower()}%"
        query = query.filter(
            or_(
                func.lower(func.coalesce(models.Customer.name, "")).like(q_like),
                func.lower(func.coalesce(models.Customer.company, "")).like(q_like),
                func.lower(func.coalesce(models.Order.bill_id, "")).like(q_like),
                cast(models.Order.id, String).like(f"%{q_raw}%"),
            )
        )
    total = query.order_by(None).count()
    rows = query.order_by(models.Order.created_at.desc()).offset(offset).limit(limit).all()
    return {
        "items": [_order_to_response(o) for o in rows],
        "total": int(total),
        "offset": int(offset),
        "limit": int(limit),
    }

@router.get("/orders/{id}")
def get_order(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    order = (
        db.query(models.Order)
        .options(
            joinedload(models.Order.customer),
            joinedload(models.Order.items).joinedload(models.OrderItem.product),
        )
        .filter(models.Order.id == id)
        .first()
    )
    if not order:
        raise HTTPException(404, "Order not found")
    items = [_order_item_to_response(item) for item in order.items]
    out = _order_to_response(order)
    out["items"] = items
    return out

@router.post("/orders")
def create_order(order: OrderCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    freight = _safe_float(order.freightCharges)
    adjustments = _safe_float(order.adjustments)
    cgst_pct = _safe_float(order.cgstPercent) if order.cgstPercent is not None else 0
    sgst_pct = _safe_float(order.sgstPercent) if order.sgstPercent is not None else 0
    igst_pct = _safe_float(order.igstPercent) if order.igstPercent is not None else 0

    subtotal = 0.0
    item_rows = []
    for item in order.items:
        prod = db.query(models.Product).filter(models.Product.id == item.productId).first()
        if not prod:
            raise HTTPException(400, f"Product {item.productId} not found")
        rate = _safe_float(item.price) if item.price is not None else _safe_float(prod.price)
        line_total = rate * item.quantity
        subtotal += line_total
        item_rows.append((item.productId, item.quantity, rate))

    # GST applied on (subtotal + freight) as taxable base
    taxable_base = subtotal + freight
    cgst_amt = taxable_base * (cgst_pct / 100)
    sgst_amt = taxable_base * (sgst_pct / 100)
    igst_amt = taxable_base * (igst_pct / 100)
    # Round only the final total; put rounding difference into adjustments so other values stay unchanged
    sum_before_adj = taxable_base + cgst_amt + sgst_amt + igst_amt
    raw_total = sum_before_adj - adjustments
    total = _round_total(raw_total)
    stored_adjustments = sum_before_adj - total

    delivery_note_dt = None
    if order.deliveryNoteDate is not None:
        if hasattr(order.deliveryNoteDate, "isoformat"):
            delivery_note_dt = order.deliveryNoteDate
        elif isinstance(order.deliveryNoteDate, str) and order.deliveryNoteDate.strip():
            try:
                delivery_note_dt = datetime.fromisoformat(order.deliveryNoteDate.replace("Z", "+00:00"))
            except (ValueError, TypeError):
                pass

    def _s(s):
        return (s or "").strip() or None

    db_order = models.Order(
        customer_id=order.customerId,
        total_amount=total,
        status=order.status,
        bill_id=_s(order.billId),
        freight_charges=freight,
        adjustments=stored_adjustments,
        cgst_percent=cgst_pct if cgst_pct else None,
        sgst_percent=sgst_pct if sgst_pct else None,
        igst_percent=igst_pct if igst_pct else None,
        delivery_note=_s(order.deliveryNote),
        reference_no=_s(order.referenceNo),
        buyers_order_no=_s(order.buyersOrderNo),
        dispatch_doc_no=_s(order.dispatchDocNo),
        dispatched_through=_s(order.dispatchedThrough),
        mode_terms_of_payment=_s(order.modeTermsOfPayment),
        other_references=_s(order.otherReferences),
        delivery_note_date=delivery_note_dt,
        destination=_s(order.destination),
        terms_of_delivery=_s(order.termsOfDelivery),
        contact_number=_s(order.contactNumber),
    )
    try:
        db.add(db_order)
        db.flush()  # Ensure order id is available before creating items
        for product_id, qty, price in item_rows:
            db_item = models.OrderItem(order_id=db_order.id, product_id=product_id, quantity=qty, price=price)
            db.add(db_item)
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise
    db.refresh(db_order)
    items = [_order_item_to_response(i) for i in db_order.items]
    out = _order_to_response(db_order)
    out["items"] = items
    return out

def _set_order_str(db_order, attr: str, payload_key: str, payload: dict):
    if payload_key in payload:
        v = payload[payload_key]
        setattr(db_order, attr, (v or "").strip() or None)


@router.patch("/orders/{id}")
def update_order(id: int, payload: dict, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Update order fields. Reference/delivery fields are always editable. Items and financial fields (freight, GST, adjustments) require pending status."""
    db_order = db.query(models.Order).filter(models.Order.id == id).first()
    if not db_order:
        raise HTTPException(404, "Order not found")
    is_pending = (db_order.status or "").strip().lower() == "pending"
    financial_keys = ("freightCharges", "adjustments", "cgstPercent", "sgstPercent", "igstPercent", "items")
    has_financial = any(k in payload for k in financial_keys)
    if has_financial and not is_pending:
        raise HTTPException(403, "Items and financial fields can only be edited when status is pending")
    try:
        if "billId" in payload:
            db_order.bill_id = (payload["billId"] or "").strip() or None
        for attr, key in [
            ("delivery_note", "deliveryNote"),
            ("reference_no", "referenceNo"),
            ("buyers_order_no", "buyersOrderNo"),
            ("dispatch_doc_no", "dispatchDocNo"),
            ("dispatched_through", "dispatchedThrough"),
            ("mode_terms_of_payment", "modeTermsOfPayment"),
            ("other_references", "otherReferences"),
            ("destination", "destination"),
            ("terms_of_delivery", "termsOfDelivery"),
            ("contact_number", "contactNumber"),
        ]:
            _set_order_str(db_order, attr, key, payload)
        if "deliveryNoteDate" in payload:
            v = payload["deliveryNoteDate"]
            if v is None or (isinstance(v, str) and not v.strip()):
                db_order.delivery_note_date = None
            elif hasattr(v, "isoformat"):
                db_order.delivery_note_date = v
            elif isinstance(v, str):
                try:
                    db_order.delivery_note_date = datetime.fromisoformat(v.replace("Z", "+00:00"))
                except (ValueError, TypeError):
                    pass
        if is_pending:
            if "freightCharges" in payload:
                db_order.freight_charges = _safe_float(payload["freightCharges"])
            if "adjustments" in payload:
                db_order.adjustments = _safe_float(payload["adjustments"])
            if "cgstPercent" in payload:
                db_order.cgst_percent = _safe_float(payload["cgstPercent"]) if payload["cgstPercent"] is not None else None
            if "sgstPercent" in payload:
                db_order.sgst_percent = _safe_float(payload["sgstPercent"]) if payload["sgstPercent"] is not None else None
            if "igstPercent" in payload:
                db_order.igst_percent = _safe_float(payload["igstPercent"]) if payload["igstPercent"] is not None else None
        # When items are provided (pending only), replace order line items
        if "items" in payload and isinstance(payload["items"], list):
            for order_item in db_order.items:
                db.delete(order_item)
            db.flush()
            subtotal = 0.0
            for row in payload["items"]:
                if not isinstance(row, dict):
                    continue
                pid = row.get("productId")
                qty = int(row.get("quantity") or 0)
                if not pid or qty <= 0:
                    continue
                prod = db.query(models.Product).filter(models.Product.id == pid).first()
                if not prod:
                    raise HTTPException(400, f"Product {pid} not found")
                rate = _safe_float(row.get("price")) if row.get("price") is not None else _safe_float(prod.price)
                subtotal += rate * qty
                db_item = models.OrderItem(order_id=db_order.id, product_id=pid, quantity=qty, price=rate)
                db.add(db_item)
            freight = _safe_float(db_order.freight_charges)
            cgst_pct = _safe_float(db_order.cgst_percent) if db_order.cgst_percent is not None else 0
            sgst_pct = _safe_float(db_order.sgst_percent) if db_order.sgst_percent is not None else 0
            igst_pct = _safe_float(db_order.igst_percent) if db_order.igst_percent is not None else 0
            adj = _safe_float(db_order.adjustments)
            taxable_base = subtotal + freight
            cgst_amt = taxable_base * (cgst_pct / 100)
            sgst_amt = taxable_base * (sgst_pct / 100)
            igst_amt = taxable_base * (igst_pct / 100)
            sum_before_adj = taxable_base + cgst_amt + sgst_amt + igst_amt
            raw_total = sum_before_adj - adj
            rounded_total = _round_total(raw_total)
            db_order.total_amount = rounded_total
            db_order.adjustments = sum_before_adj - rounded_total
        # Recompute total when only financial fields change (no items replacement) - pending only
        elif is_pending and any(k in payload for k in ("freightCharges", "adjustments", "cgstPercent", "sgstPercent", "igstPercent")):
            subtotal = sum(_safe_float(i.price) * int(i.quantity or 0) for i in db_order.items)
            freight = _safe_float(db_order.freight_charges)
            adj = _safe_float(db_order.adjustments)
            cgst_pct = _safe_float(db_order.cgst_percent) if db_order.cgst_percent is not None else 0
            sgst_pct = _safe_float(db_order.sgst_percent) if db_order.sgst_percent is not None else 0
            igst_pct = _safe_float(db_order.igst_percent) if db_order.igst_percent is not None else 0
            taxable_base = subtotal + freight
            cgst_amt = taxable_base * (cgst_pct / 100)
            sgst_amt = taxable_base * (sgst_pct / 100)
            igst_amt = taxable_base * (igst_pct / 100)
            sum_before_adj = taxable_base + cgst_amt + sgst_amt + igst_amt
            raw_total = sum_before_adj - adj
            rounded_total = _round_total(raw_total)
            db_order.total_amount = rounded_total
            db_order.adjustments = sum_before_adj - rounded_total
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise
    db.refresh(db_order)
    out = _order_to_response(db_order)
    out["items"] = [_order_item_to_response(i) for i in db_order.items]
    return out


@router.patch("/orders/{id}/status")
def update_order_status(id: int, status_update: dict, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_order = db.query(models.Order).filter(models.Order.id == id).first()
    if not db_order: raise HTTPException(404, "Order not found")
    new_status = status_update.get("status")

    db_order.status = new_status
    db.commit()
    db.refresh(db_order)
    return db_order


@router.delete("/orders/{id}")
def delete_order(id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Delete order. Only allowed when status is pending."""
    db_order = db.query(models.Order).filter(models.Order.id == id).first()
    if not db_order:
        raise HTTPException(404, "Order not found")
    if (db_order.status or "").strip().lower() != "pending":
        raise HTTPException(403, "Order can only be deleted when status is pending")
    for order_item in db_order.items:
        db.delete(order_item)
    db.delete(db_order)
    db.commit()
    return {"status": "success"}
