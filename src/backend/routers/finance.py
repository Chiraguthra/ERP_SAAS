"""Finance: Chart of Accounts, Journal Entries, Trial Balance, P&L, Balance Sheet, AP, AR, Payments, Bank Reconciliation."""
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional

from ..db.database import get_db
from ..models import models
from ..models import erp_models
from .auth import get_current_user

router = APIRouter()
TENANT_DEFAULT = 1


# --- Chart of Accounts ---

class ChartOfAccountCreate(BaseModel):
    code: str
    name: str
    account_type: str  # asset, liability, equity, revenue, expense
    parent_id: Optional[int] = None


class ChartOfAccountResponse(BaseModel):
    id: int
    code: str
    name: str
    account_type: str
    parent_id: Optional[int]
    is_active: bool

    class Config:
        from_attributes = True


@router.get("/api/chart-of-accounts", response_model=list[ChartOfAccountResponse])
def list_coa(
    tenant_id: int = Query(TENANT_DEFAULT),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(erp_models.ChartOfAccount).filter(
        erp_models.ChartOfAccount.tenant_id == tenant_id,
        erp_models.ChartOfAccount.is_active == True,
    ).order_by(erp_models.ChartOfAccount.code).all()


@router.post("/api/chart-of-accounts", response_model=ChartOfAccountResponse)
def create_coa(
    body: ChartOfAccountCreate,
    tenant_id: int = TENANT_DEFAULT,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    acc = erp_models.ChartOfAccount(
        tenant_id=tenant_id,
        code=body.code,
        name=body.name,
        account_type=body.account_type,
        parent_id=body.parent_id,
    )
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return acc


# --- Journal Entries ---

class JournalLineCreate(BaseModel):
    account_id: int
    debit: float = 0
    credit: float = 0
    description: Optional[str] = None


class JournalEntryCreate(BaseModel):
    date: str  # YYYY-MM-DD
    reference: Optional[str] = None
    description: Optional[str] = None
    lines: list[JournalLineCreate]


class JournalEntryResponse(BaseModel):
    id: int
    number: Optional[str]
    date: str
    reference: Optional[str]
    description: Optional[str]
    status: str

    class Config:
        from_attributes = True


def _next_journal_number(db: Session, tenant_id: int) -> str:
    from datetime import datetime
    y = datetime.utcnow().strftime("%Y")
    n = db.query(func.count(erp_models.JournalEntry.id)).filter(
        erp_models.JournalEntry.tenant_id == tenant_id,
    ).scalar() or 0
    return f"JE-{y}-{n + 1:05d}"


@router.get("/api/journal-entries", response_model=list[dict])
def list_journal_entries(
    tenant_id: int = Query(TENANT_DEFAULT),
    status: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(erp_models.JournalEntry).filter(erp_models.JournalEntry.tenant_id == tenant_id)
    if status:
        q = q.filter(erp_models.JournalEntry.status == status)
    if from_date:
        q = q.filter(erp_models.JournalEntry.date >= from_date)
    if to_date:
        q = q.filter(erp_models.JournalEntry.date <= to_date)
    entries = q.order_by(erp_models.JournalEntry.date.desc()).all()
    return [
        {
            "id": e.id,
            "number": e.number,
            "date": e.date.isoformat()[:10] if e.date else None,
            "reference": e.reference,
            "description": e.description,
            "status": e.status,
            "lines_count": len(e.lines),
        }
        for e in entries
    ]


@router.post("/api/journal-entries", response_model=dict)
def create_journal_entry(
    body: JournalEntryCreate,
    tenant_id: int = TENANT_DEFAULT,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    total_dr = sum(l.debit for l in body.lines)
    total_cr = sum(l.credit for l in body.lines)
    if abs(float(total_dr) - float(total_cr)) > 0.01:
        raise HTTPException(status_code=400, detail="Debits must equal credits")
    dt = datetime.fromisoformat(body.date.replace("Z", "+00:00")) if "T" in body.date else datetime.strptime(body.date, "%Y-%m-%d")
    je = erp_models.JournalEntry(
        tenant_id=tenant_id,
        number=_next_journal_number(db, tenant_id),
        date=dt,
        reference=body.reference,
        description=body.description,
        status="draft",
        created_by=current_user.id,
    )
    db.add(je)
    db.flush()
    for line in body.lines:
        db.add(erp_models.JournalLine(
            journal_id=je.id,
            account_id=line.account_id,
            debit=Decimal(str(line.debit)),
            credit=Decimal(str(line.credit)),
            description=line.description,
        ))
    db.commit()
    db.refresh(je)
    return {"id": je.id, "number": je.number, "status": je.status}


@router.post("/api/journal-entries/{je_id}/post")
def post_journal_entry(
    je_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    je = db.query(erp_models.JournalEntry).filter(erp_models.JournalEntry.id == je_id).first()
    if not je:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    if je.status == "posted":
        raise HTTPException(status_code=400, detail="Already posted")
    je.status = "posted"
    db.commit()
    return {"status": "posted"}


# --- Trial Balance ---

@router.get("/api/finance/trial-balance")
def trial_balance(
    as_of: Optional[str] = Query(None, description="YYYY-MM-DD"),
    tenant_id: int = Query(TENANT_DEFAULT),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = (
        db.query(
            erp_models.JournalLine.account_id,
            func.sum(erp_models.JournalLine.debit).label("dr"),
            func.sum(erp_models.JournalLine.credit).label("cr"),
        )
        .join(erp_models.JournalEntry)
        .filter(erp_models.JournalEntry.tenant_id == tenant_id)
        .filter(erp_models.JournalEntry.status == "posted")
        .group_by(erp_models.JournalLine.account_id)
    )
    if as_of:
        q = q.filter(erp_models.JournalEntry.date <= as_of)
    sub = q.subquery()
    rows = db.query(erp_models.ChartOfAccount, sub.c.dr, sub.c.cr).join(sub, erp_models.ChartOfAccount.id == sub.c.account_id).all()
    out = []
    for (acc, dr, cr) in rows:
        dr_val = float(dr or 0)
        cr_val = float(cr or 0)
        out.append({
            "account_id": acc.id,
            "code": acc.code,
            "name": acc.name,
            "account_type": acc.account_type,
            "debit": dr_val,
            "credit": cr_val,
            "balance_dr": max(0, dr_val - cr_val),
            "balance_cr": max(0, cr_val - dr_val),
        })
    return {"as_of": as_of, "accounts": out}


# --- P&L and Balance Sheet (simplified) ---

@router.get("/api/finance/profit-loss")
def profit_loss(
    from_date: str = Query(..., description="YYYY-MM-DD"),
    to_date: str = Query(..., description="YYYY-MM-DD"),
    tenant_id: int = Query(TENANT_DEFAULT),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Revenue - Expense = P&L
    rev = _account_balance(db, tenant_id, "revenue", from_date, to_date)
    exp = _account_balance(db, tenant_id, "expense", from_date, to_date)
    return {
        "from_date": from_date,
        "to_date": to_date,
        "revenue": rev,
        "expense": exp,
        "profit": rev - exp,
    }


@router.get("/api/finance/balance-sheet")
def balance_sheet(
    as_of: str = Query(..., description="YYYY-MM-DD"),
    tenant_id: int = Query(TENANT_DEFAULT),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    assets = _account_type_balance(db, tenant_id, "asset", as_of)
    liabilities = _account_type_balance(db, tenant_id, "liability", as_of)
    equity = _account_type_balance(db, tenant_id, "equity", as_of)
    return {
        "as_of": as_of,
        "assets": assets,
        "liabilities": liabilities,
        "equity": equity,
        "total_assets": sum(a["balance"] for a in assets),
        "total_liabilities_equity": sum(l["balance"] for l in liabilities) + sum(e["balance"] for e in equity),
    }


def _account_balance(db, tenant_id, account_type, from_date, to_date):
    """Sum (debit - credit) for account type in date range from posted journals."""
    alias = (
        db.query(
            func.sum(erp_models.JournalLine.debit - erp_models.JournalLine.credit).label("bal"),
        )
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


def _account_type_balance(db, tenant_id, account_type, as_of):
    """List accounts of type with balance as of date."""
    subq = (
        db.query(
            erp_models.JournalLine.account_id,
            func.sum(erp_models.JournalLine.debit - erp_models.JournalLine.credit).label("bal"),
        )
        .join(erp_models.JournalEntry)
        .filter(erp_models.JournalEntry.tenant_id == tenant_id)
        .filter(erp_models.JournalEntry.status == "posted")
        .filter(erp_models.JournalEntry.date <= as_of)
        .group_by(erp_models.JournalLine.account_id)
    ).subquery()
    accs = (
        db.query(erp_models.ChartOfAccount, subq.c.bal)
        .join(subq, erp_models.ChartOfAccount.id == subq.c.account_id)
        .filter(erp_models.ChartOfAccount.tenant_id == tenant_id)
        .filter(erp_models.ChartOfAccount.account_type == account_type)
        .all()
    )
    return [{"code": a.code, "name": a.name, "balance": float(b or 0)} for a, b in accs if float(b or 0) != 0]


# --- Accounts Receivable (customer ledger) ---

@router.get("/api/finance/accounts-receivable")
def list_ar(
    tenant_id: int = Query(TENANT_DEFAULT),
    customer_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = (
        db.query(erp_models.SalesInvoice)
        .filter(erp_models.SalesInvoice.tenant_id == tenant_id)
        .filter(erp_models.SalesInvoice.status.in_(["posted", "partial", "paid"]))
    )
    if customer_id:
        q = q.filter(erp_models.SalesInvoice.customer_id == customer_id)
    invs = q.all()
    out = []
    for inv in invs:
        paid = db.query(func.sum(erp_models.Payment.amount)).filter(
            erp_models.Payment.invoice_id == inv.id,
            erp_models.Payment.type == "receipt",
        ).scalar() or 0
        out.append({
            "id": inv.id,
            "number": inv.number,
            "customer_id": inv.customer_id,
            "date": inv.date.isoformat()[:10] if inv.date else None,
            "total_amount": float(inv.total_amount or 0),
            "paid": float(paid),
            "outstanding": float(inv.total_amount or 0) - float(paid),
        })
    return {"invoices": out}


# --- Accounts Payable ---

@router.get("/api/finance/accounts-payable")
def list_ap(
    tenant_id: int = Query(TENANT_DEFAULT),
    vendor_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = (
        db.query(erp_models.VendorInvoice)
        .filter(erp_models.VendorInvoice.tenant_id == tenant_id)
        .filter(erp_models.VendorInvoice.status.in_(["posted", "partial", "paid"]))
    )
    if vendor_id:
        q = q.filter(erp_models.VendorInvoice.vendor_id == vendor_id)
    invs = q.all()
    return {"invoices": [{"id": i.id, "number": i.number, "vendor_id": i.vendor_id, "date": i.date.isoformat()[:10] if i.date else None, "total_amount": float(i.total_amount or 0), "status": i.status} for i in invs]}


# --- Payments ---

class PaymentCreate(BaseModel):
    type: str  # receipt | payment
    amount: float
    date: str
    reference: Optional[str] = None
    customer_id: Optional[int] = None
    vendor_id: Optional[int] = None
    invoice_id: Optional[int] = None


@router.get("/api/payments")
def list_payments(
    tenant_id: int = Query(TENANT_DEFAULT),
    type_: Optional[str] = Query(None, alias="type"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(erp_models.Payment).filter(erp_models.Payment.tenant_id == tenant_id)
    if type_:
        q = q.filter(erp_models.Payment.type == type_)
    pays = q.order_by(erp_models.Payment.date.desc()).all()
    return {"payments": [{"id": p.id, "type": p.type, "amount": float(p.amount), "date": p.date.isoformat()[:10] if p.date else None, "reference": p.reference, "customer_id": p.customer_id, "vendor_id": p.vendor_id} for p in pays]}


@router.post("/api/payments")
def create_payment(
    body: PaymentCreate,
    tenant_id: int = TENANT_DEFAULT,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    p = erp_models.Payment(
        tenant_id=tenant_id,
        type=body.type,
        amount=Decimal(str(body.amount)),
        date=datetime.fromisoformat(body.date.replace("Z", "+00:00")) if "T" in body.date else datetime.strptime(body.date, "%Y-%m-%d"),
        reference=body.reference,
        customer_id=body.customer_id,
        vendor_id=body.vendor_id,
        invoice_id=body.invoice_id,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"id": p.id, "type": p.type, "amount": float(p.amount)}


# --- Bank reconciliation ---

@router.get("/api/bank-accounts")
def list_bank_accounts(
    tenant_id: int = Query(TENANT_DEFAULT),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    accs = db.query(erp_models.BankAccount).filter(erp_models.BankAccount.tenant_id == tenant_id).all()
    return {"accounts": [{"id": a.id, "name": a.name, "account_number": a.account_number, "bank_name": a.bank_name, "opening_balance": float(a.opening_balance or 0)} for a in accs]}


@router.post("/api/bank-accounts")
def create_bank_account(
    body: dict,
    tenant_id: int = TENANT_DEFAULT,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    name = body.get("name") or "Bank Account"
    acc = erp_models.BankAccount(tenant_id=tenant_id, name=name, account_number=body.get("account_number"), bank_name=body.get("bank_name"), opening_balance=Decimal(str(body.get("opening_balance", 0))))
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return {"id": acc.id, "name": acc.name}


@router.get("/api/bank-accounts/{account_id}/statement")
def bank_statement(
    account_id: int,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    acc = db.query(erp_models.BankAccount).filter(erp_models.BankAccount.id == account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Bank account not found")
    q = db.query(erp_models.BankStatementLine).filter(erp_models.BankStatementLine.bank_account_id == account_id)
    if from_date:
        q = q.filter(erp_models.BankStatementLine.date >= from_date)
    if to_date:
        q = q.filter(erp_models.BankStatementLine.date <= to_date)
    lines = q.order_by(erp_models.BankStatementLine.date).all()
    return {"account": {"id": acc.id, "name": acc.name}, "lines": [{"id": l.id, "date": l.date.isoformat()[:10] if l.date else None, "description": l.description, "amount": float(l.amount), "reconciled": l.reconciled} for l in lines]}


@router.post("/api/bank-accounts/{account_id}/statement")
def add_statement_line(
    account_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    acc = db.query(erp_models.BankAccount).filter(erp_models.BankAccount.id == account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Bank account not found")
    line = erp_models.BankStatementLine(
        bank_account_id=account_id,
        date=datetime.fromisoformat(body["date"].replace("Z", "+00:00")) if "T" in body["date"] else datetime.strptime(body["date"], "%Y-%m-%d"),
        description=body.get("description"),
        amount=Decimal(str(body["amount"])),
        reconciled=body.get("reconciled", False),
        matched_to=body.get("matched_to"),
    )
    db.add(line)
    db.commit()
    db.refresh(line)
    return {"id": line.id}


@router.patch("/api/bank-statement-lines/{line_id}/reconcile")
def reconcile_statement_line(
    line_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    line = db.query(erp_models.BankStatementLine).filter(erp_models.BankStatementLine.id == line_id).first()
    if not line:
        raise HTTPException(status_code=404, detail="Statement line not found")
    line.reconciled = body.get("reconciled", True)
    line.matched_to = body.get("matched_to")
    db.commit()
    return {"reconciled": line.reconciled}
