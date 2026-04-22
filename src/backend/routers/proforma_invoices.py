"""Estimate documents (GST-style PDF); defaults from estimate_defaults."""
import base64
import os
import re
from collections import defaultdict
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from io import BytesIO
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse
from jinja2 import Environment, FileSystemLoader, select_autoescape
from markupsafe import Markup, escape
from playwright.sync_api import sync_playwright
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..models import models
from .auth import get_current_user

router = APIRouter()


def _get_or_create_estimate_defaults(db: Session) -> models.EstimateDefaults:
    row = db.query(models.EstimateDefaults).first()
    if row:
        return row
    q = db.query(models.QuotationLetterDefaults).first()
    row = models.EstimateDefaults(
        buyer_name=(q.buyer_name if q else None) or "XYZ COMPANY",
        buyer_address=(q.buyer_address if q else None) or "A-29, New friends Colony,\nBhopal",
        buyer_gstin="",
        buyer_phone="",
        place_of_supply="",
        subject=(q.subject if q else None) or "Estimate for your site as discussed - reg.",
        product_details=(
            "Sr|Item|Qty|Uom|UnitPrice|GST%\n"
            "1.|Sample line|1|PCS|0|18"
        ),
        remarks=(q.remarks if q else None) or "",
        terms_and_conditions=(
            (q.terms_and_conditions if q else None)
            or (
                "1. GST Extra\n"
                "2. Freight: Extra/ F.O.R (option to be given)\n"
                "3. Payment Terms: as mutually discussed\n"
                "4. Delivery Time: 00 working Days ( to be filled)"
            )
        ),
        bank_details=(
            (q.bank_details if q else None)
            or (
                "Beneficiary Name: SILVERLINE TECHNO MANAGEMENT SERVICES\n"
                "Account Number: \n"
                "IFSC Code: \n"
                "Branch: "
            )
        ),
        seller_name=(q.seller_name if q else None) or "Nimish Gera",
        seller_designation=(q.seller_designation if q else None) or "Partner",
        seller_company=(q.seller_company if q else None) or "SilverLine Techno Management Services",
        seller_phone=(q.seller_phone if q else None) or "9962587081 / 7562042250",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _estimate_defaults_to_dict(d: models.EstimateDefaults) -> dict[str, str]:
    return {
        "buyer_name": d.buyer_name or "",
        "buyer_address": d.buyer_address or "",
        "buyer_gstin": d.buyer_gstin or "",
        "buyer_phone": d.buyer_phone or "",
        "place_of_supply": d.place_of_supply or "",
        "subject": d.subject or "",
        "product_details": d.product_details or "",
        "remarks": d.remarks or "",
        "terms_and_conditions": d.terms_and_conditions or "",
        "bank_details": d.bank_details or "",
        "seller_name": d.seller_name or "",
        "seller_designation": d.seller_designation or "",
        "seller_company": d.seller_company or "",
        "seller_phone": d.seller_phone or "",
    }


def _money_str(d: Decimal) -> str:
    q = d.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return f"₹ {q:,.2f}"


def _parse_decimal(s: str) -> Decimal:
    t = (s or "").strip().replace(",", "")
    if not t:
        return Decimal("0")
    try:
        return Decimal(t)
    except Exception:
        return Decimal("0")


def _parse_pi_product_rows(text: str) -> list[dict[str, Any]]:
    """6-column pipe: Sr|Item|Qty|Uom|UnitPrice|GST%.
    Legacy 7-column (Sr|Item|HSN|Qty|...) is still parsed for existing saved data.
    4-column quotation-style: Qty 1, GST 18."""
    lines = [line.strip() for line in (text or "").splitlines() if line.strip()]
    rows: list[dict[str, Any]] = []
    empty_row = {
        "sr": "1",
        "item": "",
        "qty": Decimal("1"),
        "uom": "",
        "unit_price": Decimal("0"),
        "gst_pct": Decimal("18"),
    }
    if not lines:
        return [empty_row]

    for idx, line in enumerate(lines):
        parts = [p.strip() for p in line.split("|")]
        if len(parts) >= 7:
            if idx == 0 and parts[1].lower() == "item":
                continue
            rows.append(
                {
                    "sr": parts[0],
                    "item": parts[1],
                    "qty": _parse_decimal(parts[3]) or Decimal("1"),
                    "uom": parts[4],
                    "unit_price": _parse_decimal(parts[5]),
                    "gst_pct": _parse_decimal(parts[6]) or Decimal("18"),
                }
            )
        elif len(parts) >= 6:
            if idx == 0 and parts[1].lower() == "item":
                continue
            rows.append(
                {
                    "sr": parts[0],
                    "item": parts[1],
                    "qty": _parse_decimal(parts[2]) or Decimal("1"),
                    "uom": parts[3],
                    "unit_price": _parse_decimal(parts[4]),
                    "gst_pct": _parse_decimal(parts[5]) or Decimal("18"),
                }
            )
        elif len(parts) >= 4:
            if idx == 0 and parts[1].lower() == "item":
                continue
            rows.append(
                {
                    "sr": parts[0],
                    "item": parts[1],
                    "qty": Decimal("1"),
                    "uom": parts[3],
                    "unit_price": _parse_decimal(parts[2]),
                    "gst_pct": Decimal("18"),
                }
            )

    return rows if rows else [empty_row]


_ONES = (
    "",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
)
_TENS = ("", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety")


def _below_hundred(n: int) -> str:
    if n < 20:
        return _ONES[n]
    t, o = n // 10, n % 10
    if o:
        return f"{_TENS[t]} {_ONES[o]}"
    return _TENS[t]


def _int_to_words_in(n: int) -> str:
    if n == 0:
        return "zero"
    parts: list[str] = []
    if n >= 10000000:
        c = n // 10000000
        cw = _below_hundred(c) if c < 100 else _int_to_words_in(c)
        parts.append(f"{cw} crore")
        n %= 10000000
    if n >= 100000:
        lak = n // 100000
        lw = _below_hundred(lak) if lak < 100 else _int_to_words_in(lak)
        parts.append(f"{lw} lakh")
        n %= 100000
    if n >= 1000:
        th = n // 1000
        tw = _below_hundred(th) if th < 100 else _int_to_words_in(th)
        parts.append(f"{tw} thousand")
        n %= 1000
    if n >= 100:
        parts.append(f"{_ONES[n // 100]} hundred")
        n %= 100
    if n > 0:
        if parts and n < 100:
            parts.append("and")
        parts.append(_below_hundred(n))
    return " ".join(p for p in parts if p)


def _amount_in_words_inr(total: Decimal) -> str:
    """Rupees + paise from amount quantized to 2 decimals (do not round rupees to nearest integer)."""
    q = total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    negative = q < 0
    q_abs = abs(q)
    # Whole number of paise (e.g. 130.98 -> 13098 ->130 rupees, 98 paise)
    total_paise = int((q_abs * 100).to_integral_value(rounding=ROUND_HALF_UP))
    rupees = total_paise // 100
    paise = total_paise % 100
    prefix = "Minus " if negative else ""
    words = prefix + _int_to_words_in(rupees).title() + " Rupees"
    if paise:
        words += f" and {_int_to_words_in(paise).title()} Paise"
    words += " only"
    return words


def _line_amounts(row: dict[str, Any]) -> tuple[Decimal, Decimal, Decimal, Decimal]:
    """taxable, gst, total line amount, gst half (for CGST/SGST display)."""
    qty = row["qty"]
    unit = row["unit_price"]
    pct = row["gst_pct"]
    taxable = (qty * unit).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    gst = (taxable * pct / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    half = (gst / Decimal("2")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return taxable, gst, taxable + gst, half


_ASSETS_DIR = Path(__file__).resolve().parents[1] / "assets"
_TEMPLATES_DIR = Path(__file__).resolve().parents[1] / "templates"
_JINJA_ENV = Environment(
    loader=FileSystemLoader(str(_TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
)


def _resolve_upi_qr_path() -> Path | None:
    envp = (os.environ.get("ESTIMATE_UPI_QR_PATH") or "").strip()
    if envp and Path(envp).is_file():
        return Path(envp)
    cand = _ASSETS_DIR / "upi-qr.png"
    return cand if cand.is_file() else None


def _resolve_company_logo_path() -> Path | None:
    envp = (os.environ.get("ESTIMATE_COMPANY_LOGO_PATH") or "").strip()
    if envp and Path(envp).is_file():
        return Path(envp)
    cand = _ASSETS_DIR / "company-logo.png"
    return cand if cand.is_file() else None


def _bank_kv_rows(text: str) -> list[tuple[str, str]]:
    """Label | value pairs from bank_details lines (Name : … style)."""
    rows: list[tuple[str, str]] = []
    for line in (text or "").splitlines():
        line = line.strip()
        if not line:
            continue
        if ":" in line:
            k, v = line.split(":", 1)
            rows.append((k.strip() + ":", v.strip()))
        else:
            rows.append(("", line))
    return rows if rows else [("", "—")]


def _estimate_aggregate(p: models.ProformaInvoice) -> dict[str, Any]:
    rows = _parse_pi_product_rows(p.product_details or "")
    rate_agg: dict[Decimal, dict[str, Decimal]] = defaultdict(
        lambda: {"taxable": Decimal("0"), "gst": Decimal("0")}
    )
    total_taxable = Decimal("0")
    total_gst = Decimal("0")
    total_amt = Decimal("0")
    line_rows_data: list[tuple[int, dict[str, Any], Decimal, Decimal, Decimal]] = []

    for i, row in enumerate(rows, start=1):
        taxable, gst, line_tot, _half = _line_amounts(row)
        total_taxable += taxable
        total_gst += gst
        total_amt += line_tot
        rate_key = row["gst_pct"].quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        rate_agg[rate_key]["taxable"] += taxable
        rate_agg[rate_key]["gst"] += gst
        line_rows_data.append((i, row, taxable, gst, line_tot))

    total_qty = sum((r["qty"] for r in rows), Decimal("0"))
    total_cgst = Decimal("0")
    total_sgst = Decimal("0")
    tax_body: list[list[Any]] = []
    for _rate_key, agg in sorted(rate_agg.items(), key=lambda x: x[0]):
        g = agg["gst"]
        t = agg["taxable"]
        if t > 0 and g > 0:
            eff_pct = (g * 100 / t).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            half_rate = (eff_pct / 2).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        else:
            half_rate = Decimal("0")
        half_amt = (g / Decimal("2")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        total_cgst += half_amt
        total_sgst += half_amt
        tax_body.append(
            [
                f"{t:,.2f}",
                f"{half_rate:.0f}",
                f"{half_amt:,.2f}",
                f"{half_rate:.0f}",
                f"{half_amt:,.2f}",
                f"{g:,.2f}",
            ]
        )
    return {
        "line_rows_data": line_rows_data,
        "tax_body": tax_body,
        "total_taxable": total_taxable,
        "total_gst": total_gst,
        "total_amt": total_amt,
        "total_qty": total_qty,
        "total_cgst": total_cgst,
        "total_sgst": total_sgst,
        "words": _amount_in_words_inr(total_amt),
    }


def _merged_bank_text(p: models.ProformaInvoice) -> str:
    return ((p.bank_details or "").strip())


def _amount_fmt(d: Decimal) -> str:
    """Formatted amount digits only (template adds ₹)."""
    q = d.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return f"{q:,.2f}"


def _value_after_colon(line: str) -> str:
    if ":" in line:
        return line.split(":", 1)[1].strip()
    return line.strip()


def _strip_term_number_prefix(line: str) -> str:
    """Remove leading '1.' / '1)' style prefixes so Jinja loop.index is the only number."""
    return re.sub(r"^\s*\d+\s*[\.\)\-:]\s*", "", line).strip()


def _terms_list_for_template(text: str) -> list[str]:
    raw = (text or "").strip()
    if not raw:
        return []
    out: list[str] = []
    for ln in raw.splitlines():
        t = _strip_term_number_prefix(ln.strip())
        if t:
            out.append(t)
    return out


def _company_block(p: models.ProformaInvoice) -> dict[str, Any]:
    lines = [ln.strip() for ln in (p.seller_company or "").splitlines() if ln.strip()]
    name = lines[0] if lines else "Company"
    phone = (p.seller_phone or "").strip()
    digits_p = "".join(c for c in phone if c.isdigit())
    addr_lines: list[str] = []
    gstin_line = ""
    state_line = ""
    for ln in lines[1:]:
        low = ln.lower()
        digits_l = "".join(c for c in ln if c.isdigit())
        if digits_p and digits_l == digits_p and len(ln) <= len(phone) + 16:
            continue
        if "gstin" in low:
            gstin_line = ln.strip()
            continue
        if low.startswith("state:") or low.startswith("state "):
            state_line = ln.strip()
            continue
        addr_lines.append(ln)
    addr_html = Markup("<br />".join(escape(x) for x in addr_lines)) if addr_lines else Markup("")
    partner_bits = [x for x in [(p.seller_designation or "").strip(), (p.seller_name or "").strip()] if x]
    partner_label = ", ".join(partner_bits)
    gstin_val = _value_after_colon(gstin_line) if gstin_line else ""
    state_val = _value_after_colon(state_line) if state_line else ""
    email_val = (os.environ.get("ESTIMATE_COMPANY_EMAIL") or "").strip()
    logo_b64 = ""
    logo_path = _resolve_company_logo_path()
    if logo_path and logo_path.is_file():
        try:
            logo_b64, _mime = _qr_file_b64(logo_path)
        except OSError:
            logo_b64 = ""
    return {
        "name": name,
        "address": addr_html,
        "phone": phone,
        "email": email_val,
        "partner_label": partner_label,
        "gstin": gstin_val,
        "state": state_val,
        "logo_base64": logo_b64,
    }


def _client_block(p: models.ProformaInvoice) -> dict[str, Any]:
    buyer_lines = [ln.strip() for ln in (p.buyer_address or "").splitlines() if ln.strip()]
    addr_html = Markup("<br />".join(escape(x) for x in buyer_lines)) if buyer_lines else Markup("")
    pos = (p.place_of_supply or "").strip()
    return {
        "name": (p.buyer_name or "").strip(),
        "address": addr_html,
        "city": "",
        "state": pos,
        "pin": "",
        "country": "",
        "contact": (p.buyer_phone or "").strip(),
        "gstin": (p.buyer_gstin or "").strip(),
    }


def _qr_file_b64(path: Path) -> tuple[str, str]:
    data = path.read_bytes()
    ext = path.suffix.lower()
    mime = "jpeg" if ext in (".jpg", ".jpeg") else "png" if ext == ".png" else "png"
    return base64.standard_b64encode(data).decode("ascii"), mime


def _bank_template_dict(bank_text: str, qr_path: Path | None) -> dict[str, Any]:
    out: dict[str, Any] = {
        "bank_name": "",
        "branch": "",
        "account_number": "",
        "ifsc": "",
        "account_holder": "",
        "qr_image_base64": "",
        "qr_mime": "png",
    }
    for lab, val in _bank_kv_rows(bank_text):
        v = (val or "").strip()
        if not v or v == "—":
            continue
        nk = lab.lower().replace(":", "").strip()
        if "account holder" in nk or "holder name" in nk or "beneficiary" in nk:
            out["account_holder"] = v
        elif "bank" in nk and "name" in nk:
            out["bank_name"] = v
        elif nk == "bank":
            out["bank_name"] = v
        elif "branch" in nk:
            out["branch"] = v
        elif "ifsc" in nk:
            out["ifsc"] = v
        elif "a/c" in nk or ("account" in nk and ("no" in nk or "number" in nk)):
            out["account_number"] = v
        elif not out["account_holder"] and (nk == "name" or nk == ""):
            out["account_holder"] = v
    if qr_path and qr_path.is_file():
        try:
            b64, mime = _qr_file_b64(qr_path)
            out["qr_image_base64"] = b64
            out["qr_mime"] = mime
        except OSError:
            pass
    return out


def _estimate_print_context(p: models.ProformaInvoice) -> dict[str, Any]:
    agg = _estimate_aggregate(p)
    bank_text = _merged_bank_text(p)
    today = date.today()
    pos = (p.place_of_supply or "").strip()

    items: list[dict[str, Any]] = []
    for _idx, row, _taxable, gst, line_tot in agg["line_rows_data"]:
        pct = row["gst_pct"]
        items.append(
            {
                "name": row["item"],
                "qty": str(row["qty"]),
                "unit": row["uom"] or "",
                "unit_price": _amount_fmt(row["unit_price"]),
                "gst_amount": _amount_fmt(gst),
                "gst_rate": f"{pct:.0f}",
                "amount": _amount_fmt(line_tot),
            }
        )

    tax_rows: list[dict[str, str]] = []
    for r in agg["tax_body"]:
        tax_rows.append(
            {
                "taxable": r[0],
                "cgst_rate": r[1],
                "cgst_amt": r[2],
                "sgst_rate": r[3],
                "sgst_amt": r[4],
                "total_tax": r[5],
            }
        )
    tt = agg["total_taxable"]
    tax_totals = {
        "taxable": f"{tt:,.2f}",
        "cgst": f"{agg['total_cgst']:,.2f}",
        "sgst": f"{agg['total_sgst']:,.2f}",
        "total": f"{agg['total_gst']:,.2f}",
    }

    terms_raw = (p.terms_and_conditions or "").strip()
    terms = _terms_list_for_template(terms_raw)

    total_amt = agg["total_amt"]
    totals = {
        "qty": str(agg["total_qty"]),
        "gst": _amount_fmt(agg["total_gst"]),
        "amount": _amount_fmt(total_amt),
        "subtotal": _amount_fmt(total_amt),
        "grand_total": _amount_fmt(total_amt),
        "amount_in_words": agg["words"],
    }

    qr_path = _resolve_upi_qr_path()
    bank = _bank_template_dict(bank_text, qr_path)
    remarks_text = (p.remarks or "").strip()

    return {
        "company": _company_block(p),
        "client": _client_block(p),
        "estimate": {
            "number": str(p.id),
            "date": today.strftime("%d/%m/%Y"),
            "place_of_supply": pos or "—",
        },
        "items": items,
        "tax_rows": tax_rows,
        "tax_totals": tax_totals,
        "totals": totals,
        "remarks": remarks_text,
        "terms": terms,
        "bank": bank,
    }


def _render_estimate_html(p: models.ProformaInvoice) -> str:
    tpl = _JINJA_ENV.get_template("estimate_print.html")
    return tpl.render(**_estimate_print_context(p))


def _html_to_pdf(html: str) -> bytes:
    chromium_args = ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"]
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=chromium_args)
        try:
            page = browser.new_page()
            page.set_content(html, wait_until="load")
            pdf_bytes = page.pdf(
                format="A4",
                margin={"top": "10mm", "bottom": "10mm", "left": "10mm", "right": "10mm"},
                print_background=True,
            )
        finally:
            browser.close()
    return pdf_bytes


def _render_pi_pdf(p: models.ProformaInvoice) -> bytes:
    return _html_to_pdf(_render_estimate_html(p))


def _pick_estimate(body: dict, defaults: models.EstimateDefaults, field: str) -> str:
    val = (body.get(field) or "").strip()
    if val:
        return val
    return (getattr(defaults, field) or "") or ""


@router.get("/api/estimate-defaults")
def get_estimate_defaults(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    d = _get_or_create_estimate_defaults(db)
    return _estimate_defaults_to_dict(d)


@router.put("/api/estimate-defaults")
def update_estimate_defaults(
    body: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    d = _get_or_create_estimate_defaults(db)
    for field in [
        "buyer_name",
        "buyer_address",
        "buyer_gstin",
        "buyer_phone",
        "place_of_supply",
        "subject",
        "product_details",
        "remarks",
        "terms_and_conditions",
        "bank_details",
        "seller_name",
        "seller_designation",
        "seller_company",
        "seller_phone",
    ]:
        if field in body:
            setattr(d, field, (body.get(field) or "").strip() or None)
    db.commit()
    db.refresh(d)
    return _estimate_defaults_to_dict(d)


@router.get("/api/proforma-invoices")
def list_proforma_invoices(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    rows = (
        db.query(models.ProformaInvoice)
        .order_by(models.ProformaInvoice.created_at.desc(), models.ProformaInvoice.id.desc())
        .all()
    )
    return {
        "proforma_invoices": [
            {
                "id": r.id,
                "buyer_name": r.buyer_name,
                "subject": r.subject,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
    }


@router.post("/api/proforma-invoices")
def create_proforma_invoice(
    body: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    d = _get_or_create_estimate_defaults(db)
    pd = (body.get("product_details") or "").strip() or (d.product_details or "")
    pi = models.ProformaInvoice(
        buyer_name=_pick_estimate(body, d, "buyer_name"),
        buyer_address=_pick_estimate(body, d, "buyer_address"),
        buyer_gstin=_pick_estimate(body, d, "buyer_gstin"),
        buyer_phone=_pick_estimate(body, d, "buyer_phone"),
        place_of_supply=_pick_estimate(body, d, "place_of_supply"),
        subject=_pick_estimate(body, d, "subject"),
        product_details=pd,
        remarks=_pick_estimate(body, d, "remarks"),
        terms_and_conditions=_pick_estimate(body, d, "terms_and_conditions"),
        bank_details=_pick_estimate(body, d, "bank_details"),
        seller_name=_pick_estimate(body, d, "seller_name"),
        seller_designation=_pick_estimate(body, d, "seller_designation"),
        seller_company=_pick_estimate(body, d, "seller_company"),
        seller_phone=_pick_estimate(body, d, "seller_phone"),
    )
    db.add(pi)
    db.commit()
    db.refresh(pi)
    return {
        "id": pi.id,
        "buyer_name": pi.buyer_name,
        "subject": pi.subject,
        "created_at": pi.created_at.isoformat() if pi.created_at else None,
    }


@router.get("/api/proforma-invoices/{invoice_id}")
def get_proforma_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    p = db.query(models.ProformaInvoice).filter(models.ProformaInvoice.id == invoice_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Estimate not found")
    return {
        "id": p.id,
        "buyer_name": p.buyer_name,
        "buyer_address": p.buyer_address,
        "buyer_gstin": p.buyer_gstin,
        "buyer_phone": p.buyer_phone,
        "place_of_supply": p.place_of_supply,
        "subject": p.subject,
        "product_details": p.product_details,
        "remarks": p.remarks,
        "terms_and_conditions": p.terms_and_conditions,
        "bank_details": p.bank_details,
        "seller_name": p.seller_name,
        "seller_designation": p.seller_designation,
        "seller_company": p.seller_company,
        "seller_phone": p.seller_phone,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


@router.patch("/api/proforma-invoices/{invoice_id}")
def update_proforma_invoice(
    invoice_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    p = db.query(models.ProformaInvoice).filter(models.ProformaInvoice.id == invoice_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Estimate not found")

    for field in [
        "buyer_name",
        "buyer_address",
        "buyer_gstin",
        "buyer_phone",
        "place_of_supply",
        "subject",
        "product_details",
        "remarks",
        "terms_and_conditions",
        "bank_details",
        "seller_name",
        "seller_designation",
        "seller_company",
        "seller_phone",
    ]:
        if field not in body:
            continue
        raw = body[field]
        if raw is None:
            setattr(p, field, None)
            continue
        s = raw.strip() if isinstance(raw, str) else str(raw).strip()
        setattr(p, field, s or None)

    db.commit()
    db.refresh(p)
    return {"id": p.id}


@router.get("/api/proforma-invoices/{invoice_id}/pdf")
def download_proforma_invoice_pdf(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    p = db.query(models.ProformaInvoice).filter(models.ProformaInvoice.id == invoice_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Estimate not found")
    pdf_bytes = _render_pi_pdf(p)
    filename = f"Estimate-{invoice_id:03d}.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/api/proforma-invoices/{invoice_id}/html")
def proforma_invoice_print_html(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    p = db.query(models.ProformaInvoice).filter(models.ProformaInvoice.id == invoice_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Estimate not found")
    return HTMLResponse(content=_render_estimate_html(p), media_type="text/html; charset=utf-8")
