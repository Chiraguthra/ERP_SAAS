"""Procurement: Vendors, Purchase Request, Purchase Order, Goods Receipt, Vendor Invoice, 3-way match."""
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


# --- Vendors ---

class VendorCreate(BaseModel):
    name: str
    company: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


@router.get("/api/vendors")
def list_vendors(
    tenant_id: int = Query(TENANT_DEFAULT),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    v = db.query(erp_models.Vendor).filter(erp_models.Vendor.tenant_id == tenant_id).all()
    return {"vendors": [{"id": x.id, "name": x.name, "company": x.company, "gstin": x.gstin, "phone": x.phone, "email": x.email} for x in v]}


@router.post("/api/vendors")
def create_vendor(
    body: VendorCreate,
    tenant_id: int = TENANT_DEFAULT,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    v = erp_models.Vendor(
        tenant_id=tenant_id,
        name=body.name,
        company=body.company,
        address=body.address,
        city=body.city,
        state=body.state,
        gstin=body.gstin,
        pan=body.pan,
        phone=body.phone,
        email=body.email,
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return {"id": v.id, "name": v.name}


@router.patch("/api/vendors/{vendor_id}")
def update_vendor(
    vendor_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    v = db.query(erp_models.Vendor).filter(erp_models.Vendor.id == vendor_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")
    for k in ["name", "company", "address", "city", "state", "gstin", "pan", "phone", "email"]:
        if k in body and body[k] is not None:
            setattr(v, k, body[k])
    db.commit()
    db.refresh(v)
    return {"id": v.id}


# --- Purchase Request ---

class PRItemCreate(BaseModel):
    product_id: Optional[int] = None
    description: Optional[str] = None
    quantity: float
    estimated_price: Optional[float] = None


class PurchaseRequestCreate(BaseModel):
    date: str
    items: list[PRItemCreate]


@router.get("/api/purchase-requests")
def list_purchase_requests(
    tenant_id: int = Query(TENANT_DEFAULT),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    prs = db.query(erp_models.PurchaseRequest).filter(erp_models.PurchaseRequest.tenant_id == tenant_id).order_by(erp_models.PurchaseRequest.date.desc()).all()
    return {"purchase_requests": [{"id": p.id, "number": p.number, "date": p.date.isoformat()[:10] if p.date else None, "status": p.status} for p in prs]}


@router.post("/api/purchase-requests")
def create_purchase_request(
    body: PurchaseRequestCreate,
    tenant_id: int = TENANT_DEFAULT,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    n = db.query(func.count(erp_models.PurchaseRequest.id)).filter(erp_models.PurchaseRequest.tenant_id == tenant_id).scalar() or 0
    number = f"PR-{datetime.utcnow().strftime('%Y')}-{n + 1:05d}"
    pr = erp_models.PurchaseRequest(
        tenant_id=tenant_id,
        number=number,
        date=datetime.fromisoformat(body.date.replace("Z", "+00:00")) if "T" in body.date else datetime.strptime(body.date, "%Y-%m-%d"),
        status="draft",
        requested_by=current_user.id,
    )
    db.add(pr)
    db.flush()
    for it in body.items:
        db.add(erp_models.PurchaseRequestItem(
            purchase_request_id=pr.id,
            product_id=it.product_id,
            description=it.description,
            quantity=it.quantity,
            estimated_price=Decimal(str(it.estimated_price)) if it.estimated_price is not None else None,
        ))
    db.commit()
    db.refresh(pr)
    return {"id": pr.id, "number": pr.number}


# --- Purchase Order ---

class POItemCreate(BaseModel):
    product_id: Optional[int] = None
    description: Optional[str] = None
    quantity: float
    price: float


class PurchaseOrderCreate(BaseModel):
    vendor_id: int
    date: str
    items: list[POItemCreate]


@router.get("/api/purchase-orders")
def list_purchase_orders(
    tenant_id: int = Query(TENANT_DEFAULT),
    vendor_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(erp_models.PurchaseOrder).filter(erp_models.PurchaseOrder.tenant_id == tenant_id)
    if vendor_id:
        q = q.filter(erp_models.PurchaseOrder.vendor_id == vendor_id)
    pos = q.order_by(erp_models.PurchaseOrder.date.desc()).all()
    return {"purchase_orders": [{"id": p.id, "number": p.number, "vendor_id": p.vendor_id, "date": p.date.isoformat()[:10] if p.date else None, "status": p.status, "total_amount": float(p.total_amount or 0)} for p in pos]}


@router.post("/api/purchase-orders")
def create_purchase_order(
    body: PurchaseOrderCreate,
    tenant_id: int = TENANT_DEFAULT,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    n = db.query(func.count(erp_models.PurchaseOrder.id)).filter(erp_models.PurchaseOrder.tenant_id == tenant_id).scalar() or 0
    number = f"PO-{datetime.utcnow().strftime('%Y')}-{n + 1:05d}"
    total = sum(it.quantity * it.price for it in body.items)
    po = erp_models.PurchaseOrder(
        tenant_id=tenant_id,
        number=number,
        vendor_id=body.vendor_id,
        date=datetime.fromisoformat(body.date.replace("Z", "+00:00")) if "T" in body.date else datetime.strptime(body.date, "%Y-%m-%d"),
        status="draft",
        total_amount=Decimal(str(total)),
    )
    db.add(po)
    db.flush()
    for it in body.items:
        db.add(erp_models.PurchaseOrderItem(
            purchase_order_id=po.id,
            product_id=it.product_id,
            description=it.description,
            quantity=it.quantity,
            price=Decimal(str(it.price)),
        ))
    db.commit()
    db.refresh(po)
    return {"id": po.id, "number": po.number, "total_amount": total}


# --- Goods Receipt ---

class GRItemCreate(BaseModel):
    product_id: int
    quantity: float
    purchase_order_item_id: Optional[int] = None


class GoodsReceiptCreate(BaseModel):
    purchase_order_id: int
    date: str
    items: list[GRItemCreate]


@router.get("/api/goods-receipts")
def list_goods_receipts(
    tenant_id: int = Query(TENANT_DEFAULT),
    purchase_order_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(erp_models.GoodsReceipt).filter(erp_models.GoodsReceipt.tenant_id == tenant_id)
    if purchase_order_id:
        q = q.filter(erp_models.GoodsReceipt.purchase_order_id == purchase_order_id)
    grs = q.order_by(erp_models.GoodsReceipt.date.desc()).all()
    return {"goods_receipts": [{"id": g.id, "number": g.number, "purchase_order_id": g.purchase_order_id, "date": g.date.isoformat()[:10] if g.date else None, "status": g.status} for g in grs]}


@router.post("/api/goods-receipts")
def create_goods_receipt(
    body: GoodsReceiptCreate,
    tenant_id: int = TENANT_DEFAULT,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    po = db.query(erp_models.PurchaseOrder).filter(erp_models.PurchaseOrder.id == body.purchase_order_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    n = db.query(func.count(erp_models.GoodsReceipt.id)).filter(erp_models.GoodsReceipt.tenant_id == tenant_id).scalar() or 0
    number = f"GR-{datetime.utcnow().strftime('%Y')}-{n + 1:05d}"
    gr = erp_models.GoodsReceipt(
        tenant_id=tenant_id,
        number=number,
        purchase_order_id=body.purchase_order_id,
        date=datetime.fromisoformat(body.date.replace("Z", "+00:00")) if "T" in body.date else datetime.strptime(body.date, "%Y-%m-%d"),
        status="draft",
    )
    db.add(gr)
    db.flush()
    for it in body.items:
        db.add(erp_models.GoodsReceiptItem(
            goods_receipt_id=gr.id,
            purchase_order_item_id=it.purchase_order_item_id,
            product_id=it.product_id,
            quantity=it.quantity,
        ))
    db.commit()
    db.refresh(gr)
    return {"id": gr.id, "number": gr.number}


# --- Vendor Invoice ---

class VendorInvoiceLineCreate(BaseModel):
    description: Optional[str] = None
    quantity: float
    price: float
    amount: float


class VendorInvoiceCreate(BaseModel):
    vendor_id: int
    purchase_order_id: Optional[int] = None
    number: Optional[str] = None
    date: str
    due_date: Optional[str] = None
    lines: list[VendorInvoiceLineCreate]


@router.get("/api/vendor-invoices")
def list_vendor_invoices(
    tenant_id: int = Query(TENANT_DEFAULT),
    vendor_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(erp_models.VendorInvoice).filter(erp_models.VendorInvoice.tenant_id == tenant_id)
    if vendor_id:
        q = q.filter(erp_models.VendorInvoice.vendor_id == vendor_id)
    invs = q.order_by(erp_models.VendorInvoice.date.desc()).all()
    return {"vendor_invoices": [{"id": i.id, "number": i.number, "vendor_id": i.vendor_id, "purchase_order_id": i.purchase_order_id, "date": i.date.isoformat()[:10] if i.date else None, "total_amount": float(i.total_amount or 0), "status": i.status, "match_status": i.match_status} for i in invs]}


@router.post("/api/vendor-invoices")
def create_vendor_invoice(
    body: VendorInvoiceCreate,
    tenant_id: int = TENANT_DEFAULT,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    total = sum(l.amount for l in body.lines)
    number = body.number or f"VI-{datetime.utcnow().strftime('%Y')}-{(db.query(func.count(erp_models.VendorInvoice.id)).filter(erp_models.VendorInvoice.tenant_id == tenant_id).scalar() or 0) + 1:05d}"
    inv = erp_models.VendorInvoice(
        tenant_id=tenant_id,
        number=number,
        vendor_id=body.vendor_id,
        purchase_order_id=body.purchase_order_id,
        date=datetime.fromisoformat(body.date.replace("Z", "+00:00")) if "T" in body.date else datetime.strptime(body.date, "%Y-%m-%d"),
        due_date=datetime.fromisoformat(body.due_date.replace("Z", "+00:00")) if body.due_date and "T" in body.due_date else (datetime.strptime(body.due_date, "%Y-%m-%d") if body.due_date else None),
        total_amount=Decimal(str(total)),
        status="draft",
        match_status="unmatched",
    )
    db.add(inv)
    db.flush()
    for line in body.lines:
        db.add(erp_models.VendorInvoiceLine(
            vendor_invoice_id=inv.id,
            description=line.description,
            quantity=line.quantity,
            price=Decimal(str(line.price)),
            amount=Decimal(str(line.amount)),
        ))
    db.commit()
    db.refresh(inv)
    return {"id": inv.id, "number": inv.number}


# --- 3-way match (basic) ---

@router.get("/api/vendor-invoices/{inv_id}/match-status")
def get_match_status(
    inv_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    inv = db.query(erp_models.VendorInvoice).filter(erp_models.VendorInvoice.id == inv_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Vendor invoice not found")
    # Basic: if linked to PO and amounts align, consider matched
    po_total = None
    if inv.purchase_order_id:
        po = db.query(erp_models.PurchaseOrder).filter(erp_models.PurchaseOrder.id == inv.purchase_order_id).first()
        po_total = float(po.total_amount) if po else None
    inv_total = float(inv.total_amount or 0)
    status = "unmatched"
    if po_total is not None and abs(inv_total - po_total) < 0.02:
        status = "matched"
    elif po_total is not None:
        status = "partial"
    return {"invoice_id": inv.id, "invoice_total": inv_total, "po_total": po_total, "match_status": status}


@router.post("/api/vendor-invoices/{inv_id}/match")
def set_match_status(
  inv_id: int,
  body: dict,
  db: Session = Depends(get_db),
  current_user: models.User = Depends(get_current_user),
):
    inv = db.query(erp_models.VendorInvoice).filter(erp_models.VendorInvoice.id == inv_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Vendor invoice not found")
    inv.match_status = body.get("match_status", "matched")
    db.commit()
    return {"match_status": inv.match_status}
