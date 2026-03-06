"""Sales: Quotations, Sales Invoices, Delivery Notes, Customer Ledger."""
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


# --- Quotations ---

class QuotationItemCreate(BaseModel):
    product_id: int
    quantity: float
    price: float


class QuotationCreate(BaseModel):
    customer_id: int
    date: str
    valid_until: Optional[str] = None
    items: list[QuotationItemCreate]


@router.get("/api/quotations")
def list_quotations(
    tenant_id: int = Query(TENANT_DEFAULT),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(erp_models.Quotation).filter(erp_models.Quotation.tenant_id == tenant_id)
    if status:
        q = q.filter(erp_models.Quotation.status == status)
    quots = q.order_by(erp_models.Quotation.date.desc()).all()
    return {"quotations": [{"id": q.id, "number": q.number, "customer_id": q.customer_id, "date": q.date.isoformat()[:10] if q.date else None, "status": q.status, "total_amount": float(q.total_amount or 0)} for q in quots]}


@router.post("/api/quotations")
def create_quotation(
    body: QuotationCreate,
    tenant_id: int = TENANT_DEFAULT,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    n = db.query(func.count(erp_models.Quotation.id)).filter(erp_models.Quotation.tenant_id == tenant_id).scalar() or 0
    number = f"QT-{datetime.utcnow().strftime('%Y')}-{n + 1:05d}"
    q = erp_models.Quotation(
        tenant_id=tenant_id,
        number=number,
        customer_id=body.customer_id,
        date=datetime.fromisoformat(body.date.replace("Z", "+00:00")) if "T" in body.date else datetime.strptime(body.date, "%Y-%m-%d"),
        valid_until=datetime.fromisoformat(body.valid_until.replace("Z", "+00:00")) if body.valid_until and "T" in body.valid_until else (datetime.strptime(body.valid_until, "%Y-%m-%d") if body.valid_until else None),
        status="draft",
        total_amount=0,
    )
    db.add(q)
    db.flush()
    total = Decimal(0)
    for it in body.items:
        line = erp_models.QuotationItem(quotation_id=q.id, product_id=it.product_id, quantity=it.quantity, price=Decimal(str(it.price)))
        db.add(line)
        total += Decimal(str(it.quantity)) * Decimal(str(it.price))
    q.total_amount = total
    db.commit()
    db.refresh(q)
    return {"id": q.id, "number": q.number, "total_amount": float(total)}


# --- Sales Invoices ---

class SalesInvoiceCreate(BaseModel):
    order_id: Optional[int] = None
    customer_id: int
    date: str
    due_date: Optional[str] = None
    subtotal: float
    tax_amount: float = 0
    total_amount: float


@router.get("/api/sales-invoices")
def list_sales_invoices(
    tenant_id: int = Query(TENANT_DEFAULT),
    customer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(erp_models.SalesInvoice).filter(erp_models.SalesInvoice.tenant_id == tenant_id)
    if customer_id:
        q = q.filter(erp_models.SalesInvoice.customer_id == customer_id)
    invs = q.order_by(erp_models.SalesInvoice.date.desc()).all()
    return {"invoices": [{"id": i.id, "number": i.number, "customer_id": i.customer_id, "order_id": i.order_id, "date": i.date.isoformat()[:10] if i.date else None, "total_amount": float(i.total_amount or 0), "status": i.status} for i in invs]}


@router.post("/api/sales-invoices")
def create_sales_invoice(
    body: SalesInvoiceCreate,
    tenant_id: int = TENANT_DEFAULT,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    n = db.query(func.count(erp_models.SalesInvoice.id)).filter(erp_models.SalesInvoice.tenant_id == tenant_id).scalar() or 0
    number = f"INV-{datetime.utcnow().strftime('%Y')}-{n + 1:05d}"
    inv = erp_models.SalesInvoice(
        tenant_id=tenant_id,
        number=number,
        order_id=body.order_id,
        customer_id=body.customer_id,
        date=datetime.fromisoformat(body.date.replace("Z", "+00:00")) if "T" in body.date else datetime.strptime(body.date, "%Y-%m-%d"),
        due_date=datetime.fromisoformat(body.due_date.replace("Z", "+00:00")) if body.due_date and "T" in body.due_date else (datetime.strptime(body.due_date, "%Y-%m-%d") if body.due_date else None),
        subtotal=Decimal(str(body.subtotal)),
        tax_amount=Decimal(str(body.tax_amount)),
        total_amount=Decimal(str(body.total_amount)),
        status="draft",
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return {"id": inv.id, "number": inv.number, "status": inv.status}


@router.post("/api/sales-invoices/{inv_id}/post")
def post_sales_invoice(
    inv_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    inv = db.query(erp_models.SalesInvoice).filter(erp_models.SalesInvoice.id == inv_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    inv.status = "posted"
    db.commit()
    return {"status": "posted"}


# --- Delivery Notes ---

class DeliveryNoteItemCreate(BaseModel):
    product_id: int
    quantity: float


class DeliveryNoteCreate(BaseModel):
    order_id: int
    date: str
    items: list[DeliveryNoteItemCreate]


@router.get("/api/delivery-notes")
def list_delivery_notes(
    tenant_id: int = Query(TENANT_DEFAULT),
    order_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(erp_models.DeliveryNote).filter(erp_models.DeliveryNote.tenant_id == tenant_id)
    if order_id:
        q = q.filter(erp_models.DeliveryNote.order_id == order_id)
    notes = q.order_by(erp_models.DeliveryNote.date.desc()).all()
    return {"delivery_notes": [{"id": d.id, "number": d.number, "order_id": d.order_id, "date": d.date.isoformat()[:10] if d.date else None, "status": d.status} for d in notes]}


@router.post("/api/delivery-notes")
def create_delivery_note(
    body: DeliveryNoteCreate,
    tenant_id: int = TENANT_DEFAULT,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    n = db.query(func.count(erp_models.DeliveryNote.id)).filter(erp_models.DeliveryNote.tenant_id == tenant_id).scalar() or 0
    number = f"DN-{datetime.utcnow().strftime('%Y')}-{n + 1:05d}"
    dn = erp_models.DeliveryNote(
        tenant_id=tenant_id,
        number=number,
        order_id=body.order_id,
        date=datetime.fromisoformat(body.date.replace("Z", "+00:00")) if "T" in body.date else datetime.strptime(body.date, "%Y-%m-%d"),
        status="draft",
    )
    db.add(dn)
    db.flush()
    for it in body.items:
        db.add(erp_models.DeliveryNoteItem(delivery_note_id=dn.id, product_id=it.product_id, quantity=it.quantity))
    db.commit()
    db.refresh(dn)
    return {"id": dn.id, "number": dn.number}


# --- Customer Ledger (AR by customer) ---

@router.get("/api/customer-ledger")
def customer_ledger(
    customer_id: int = Query(...),
    tenant_id: int = Query(TENANT_DEFAULT),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    invs = db.query(erp_models.SalesInvoice).filter(
        erp_models.SalesInvoice.tenant_id == tenant_id,
        erp_models.SalesInvoice.customer_id == customer_id,
        erp_models.SalesInvoice.status.in_(["posted", "partial", "paid"]),
    ).all()
    payments = db.query(erp_models.Payment).filter(
        erp_models.Payment.tenant_id == tenant_id,
        erp_models.Payment.customer_id == customer_id,
        erp_models.Payment.type == "receipt",
    ).all()
    ledger = []
    for i in invs:
        ledger.append({"type": "invoice", "date": i.date.isoformat()[:10] if i.date else None, "number": i.number, "debit": float(i.total_amount or 0), "credit": 0})
    for p in payments:
        ledger.append({"type": "payment", "date": p.date.isoformat()[:10] if p.date else None, "reference": p.reference, "debit": 0, "credit": float(p.amount)})
    ledger.sort(key=lambda x: x["date"] or "")
    balance = 0
    for row in ledger:
        balance += row["debit"] - row["credit"]
        row["balance"] = balance
    return {"customer_id": customer_id, "ledger": ledger, "outstanding_balance": balance}
