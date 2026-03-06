"""Reporting: Financial, Sales, Inventory reports; Export to Excel/PDF."""
import io
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import Optional

from ..db.database import get_db
from ..models import models
from ..models import erp_models
from .auth import get_current_user

router = APIRouter()
TENANT_DEFAULT = 1


@router.get("/api/reports/financial-summary")
def financial_summary_report(
    from_date: str = Query(...),
    to_date: str = Query(...),
    tenant_id: int = Query(TENANT_DEFAULT),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Summary for P&L and key metrics."""
    rev = _account_balance(db, tenant_id, "revenue", from_date, to_date)
    exp = _account_balance(db, tenant_id, "expense", from_date, to_date)
    return {"from_date": from_date, "to_date": to_date, "revenue": rev, "expense": exp, "profit": rev - exp}


def _account_balance(db, tenant_id, account_type, from_date, to_date):
    alias = (
        db.query(func.sum(erp_models.JournalLine.debit - erp_models.JournalLine.credit))
        .select_from(erp_models.JournalLine)
        .join(erp_models.JournalEntry)
        .join(erp_models.ChartOfAccount, erp_models.ChartOfAccount.id == erp_models.JournalLine.account_id)
        .filter(erp_models.JournalEntry.tenant_id == tenant_id)
        .filter(erp_models.JournalEntry.status == "posted")
        .filter(erp_models.ChartOfAccount.account_type == account_type)
        .filter(erp_models.JournalEntry.date >= from_date)
        .filter(erp_models.JournalEntry.date <= to_date)
    ).scalar()
    return float(alias or 0)


@router.get("/api/reports/sales-summary")
def sales_summary_report(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    tenant_id: int = Query(TENANT_DEFAULT),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.Order).filter(models.Order.status == "delivered")
    if from_date:
        q = q.filter(models.Order.created_at >= from_date)
    if to_date:
        q = q.filter(models.Order.created_at <= to_date)
    orders = q.all()
    total_revenue = sum(float(o.total_amount or 0) for o in orders)
    return {"from_date": from_date, "to_date": to_date, "order_count": len(orders), "total_revenue": total_revenue}


@router.get("/api/reports/inventory-summary")
def inventory_summary_report(
    tenant_id: int = Query(TENANT_DEFAULT),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    products = db.query(models.Product).all()
    total_qty = sum(float(p.stock or 0) for p in products)
    total_val = sum(float(p.stock or 0) * float(p.price or 0) for p in products)
    low_stock = [p for p in products if p.reorder_level is not None and float(p.stock or 0) <= float(p.reorder_level or 0)]
    return {"product_count": len(products), "total_quantity": total_qty, "total_value": total_val, "low_stock_count": len(low_stock)}


# --- Export Excel (CSV for minimal dependency; optional openpyxl) ---

@router.get("/api/reports/export/sales")
def export_sales_csv(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.Order).join(models.Customer)
    if from_date:
        q = q.filter(models.Order.created_at >= from_date)
    if to_date:
        q = q.filter(models.Order.created_at <= to_date)
    orders = q.order_by(models.Order.created_at.desc()).all()
    output = io.StringIO()
    output.write("Order ID,Date,Customer,Total,Status\n")
    for o in orders:
        cname = o.customer.company or o.customer.name or ""
        output.write(f"{o.id},{o.created_at.strftime('%Y-%m-%d') if o.created_at else ''},{cname},{o.total_amount},{o.status}\n")
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sales-report.csv"},
    )


@router.get("/api/reports/export/inventory")
def export_inventory_csv(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    products = db.query(models.Product).order_by(models.Product.name).all()
    output = io.StringIO()
    output.write("ID,Name,SKU,Stock,Unit,Price,Reorder Level\n")
    for p in products:
        output.write(f"{p.id},{p.name or ''},{p.sku or ''},{p.stock or 0},{p.unit or ''},{p.price or 0},{p.reorder_level or ''}\n")
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=inventory-report.csv"},
    )


@router.get("/api/reports/export/trial-balance")
def export_trial_balance_csv(
    as_of: str = Query(...),
    tenant_id: int = Query(TENANT_DEFAULT),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from .finance import trial_balance
    result = trial_balance(as_of=as_of, tenant_id=tenant_id, db=db, current_user=current_user)
    output = io.StringIO()
    output.write("Code,Name,Type,Debit,Credit,Balance DR,Balance CR\n")
    for a in result.get("accounts", []):
        output.write(f"{a['code']},{a['name']},{a['account_type']},{a['debit']},{a['credit']},{a['balance_dr']},{a['balance_cr']}\n")
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=trial-balance-{as_of}.csv"},
    )


# PDF: optional - return JSON for now; can add weasyprint/reportlab later
@router.get("/api/reports/export/financial-pdf")
def export_financial_pdf(
    report_type: str = Query("pl", description="pl | bs"),
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    as_of: Optional[str] = None,
    tenant_id: int = Query(TENANT_DEFAULT),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return financial report data (PDF generation can be added via reportlab)."""
    if report_type == "pl":
        from .finance import profit_loss
        fd = from_date or to_date or datetime.utcnow().strftime("%Y-%m-%d")
        td = to_date or from_date or datetime.utcnow().strftime("%Y-%m-%d")
        return profit_loss(from_date=fd, to_date=td, tenant_id=tenant_id, db=db, current_user=current_user)
    from .finance import balance_sheet
    return balance_sheet(as_of=as_of or datetime.utcnow().strftime("%Y-%m-%d"), tenant_id=tenant_id, db=db, current_user=current_user)
