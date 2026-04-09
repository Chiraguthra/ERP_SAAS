from datetime import datetime, date
from io import BytesIO
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..models import models
from .auth import get_current_user

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader, simpleSplit
from reportlab.platypus import Table, TableStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


router = APIRouter()

# Images are stored inside backend/assets so they are available inside the Docker image
TOP_IMAGE_PATH = Path(__file__).resolve().parents[1] / "assets" / "quotation-top.png"
BOTTOM_IMAGE_PATH = Path(__file__).resolve().parents[1] / "assets" / "quotation-bottom.png"


def _pdf_safe(text: str) -> str:
    """Keep text intact (including ₹) for unicode-capable fonts."""
    return text or ""


def _resolve_pdf_fonts() -> tuple[str, str]:
    """
    Register and return unicode-capable font names when available.
    Falls back to Times fonts if TTF files are unavailable.
    """
    regular = "Times-Roman"
    bold = "Times-Bold"

    font_candidates = [
        # Common Linux paths (container/host)
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        ("/usr/share/fonts/dejavu/DejaVuSans.ttf", "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"),
        # Common Windows paths (local development)
        ("C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/arialbd.ttf"),
    ]

    for regular_path, bold_path in font_candidates:
        try:
            if Path(regular_path).exists():
                pdfmetrics.registerFont(TTFont("ERPUnicodeRegular", regular_path))
                regular = "ERPUnicodeRegular"
            if Path(bold_path).exists():
                pdfmetrics.registerFont(TTFont("ERPUnicodeBold", bold_path))
                bold = "ERPUnicodeBold"
            if regular.startswith("ERPUnicode"):
                if not bold.startswith("ERPUnicode"):
                    bold = regular
                return regular, bold
        except Exception:
            continue

    return regular, bold


class QuotationLetterBody:
    buyer_name: Optional[str]
    buyer_address: Optional[str]
    subject: Optional[str]
    product_details: Optional[str]
    remarks: Optional[str]
    terms_and_conditions: Optional[str]
    bank_details: Optional[str]
    seller_name: Optional[str]
    seller_designation: Optional[str]
    seller_company: Optional[str]
    seller_phone: Optional[str]


def _parse_product_rows(text: str) -> list[list[str]]:
    lines = [line.strip() for line in (text or "").splitlines() if line.strip()]
    rows = [["Sr. no.", "Item", "Rate", "Uom"]]
    if not lines:
        return rows + [["1.", "", "", ""]]

    data_lines = lines[1:] if len(lines) > 1 else []
    for line in data_lines:
        if "|" in line:
            parts = [p.strip() for p in line.split("|")]
            if len(parts) >= 4:
                rows.append([_pdf_safe(parts[0]), _pdf_safe(parts[1]), _pdf_safe(parts[2]), _pdf_safe(parts[3])])
                continue

        tokens = line.split()
        if not tokens:
            continue

        sr_no = tokens[0]
        rate_idx = next(
            (i for i, token in enumerate(tokens[1:], start=1) if token.replace(".", "", 1).isdigit()),
            -1,
        )
        if rate_idx == -1:
            rows.append([_pdf_safe(sr_no), _pdf_safe(" ".join(tokens[1:])), "", ""])
            continue

        item_name = _pdf_safe(" ".join(tokens[1:rate_idx]))
        rate = _pdf_safe(tokens[rate_idx])
        uom = _pdf_safe(" ".join(tokens[rate_idx + 1 :]))
        rows.append([_pdf_safe(sr_no), item_name, rate, uom])

    if len(rows) == 1:
        rows.append(["1.", "", "", ""])
    return rows


def _image_reader(path: Path) -> ImageReader | None:
    if not path.exists():
        return None
    with path.open("rb") as file_obj:
        return ImageReader(BytesIO(file_obj.read()))


def _get_or_create_defaults(db: Session) -> models.QuotationLetterDefaults:
    defaults = db.query(models.QuotationLetterDefaults).first()
    if defaults:
        return defaults
    defaults = models.QuotationLetterDefaults(
        buyer_name="XYZ COMPANY",
        buyer_address="A-29, New friends Colony,\nBhopal",
        subject="Quotation for your site as discussed - reg.",
        product_details="Sr. no. Item Rate Uom\n1. xyz 100 Per Nos.",
        remarks="",
        terms_and_conditions=(
            "1. GST Extra\n"
            "2. Freight: Extra/ F.O.R (option to be given)\n"
            "3. Payment Terms: as mutually discussed\n"
            "4. Delivery Time: 00 working Days ( to be filled)"
        ),
        bank_details=(
            "Beneficiary Name: SILVERLINE TECHNO MANAGEMENT SERVICES\n"
            "Account Number: \n"
            "IFSC Code: \n"
            "Branch: "
        ),
        seller_name="Nimish Gera",
        seller_designation="Partner",
        seller_company="SilverLine Techno Management Services",
        seller_phone="9962587081 / 7562042250",
    )
    db.add(defaults)
    db.commit()
    db.refresh(defaults)
    return defaults


@router.get("/api/quotation-letter-defaults")
def get_quotation_letter_defaults(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    d = _get_or_create_defaults(db)
    return {
        "buyer_name": d.buyer_name or "",
        "buyer_address": d.buyer_address or "",
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


@router.put("/api/quotation-letter-defaults")
def update_quotation_letter_defaults(
    body: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    d = _get_or_create_defaults(db)
    for field in [
        "buyer_name",
        "buyer_address",
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
            setattr(d, field, (body.get(field) or "").strip())
    db.commit()
    db.refresh(d)
    return get_quotation_letter_defaults(db=db, current_user=current_user)


@router.get("/api/quotation-letters")
def list_quotation_letters(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    rows = (
        db.query(models.QuotationLetter)
        .order_by(models.QuotationLetter.created_at.desc(), models.QuotationLetter.id.desc())
        .all()
    )
    return {
        "quotations": [
            {
                "id": q.id,
                "buyer_name": q.buyer_name,
                "subject": q.subject,
                "created_at": q.created_at.isoformat() if q.created_at else None,
            }
            for q in rows
        ]
    }


@router.post("/api/quotation-letters")
def create_quotation_letter(
    body: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    defaults = _get_or_create_defaults(db)

    def pick(field: str) -> str:
        val = (body.get(field) or "").strip()
        if val:
            return val
        return getattr(defaults, field) or ""

    q = models.QuotationLetter(
        buyer_name=pick("buyer_name"),
        buyer_address=pick("buyer_address"),
        subject=pick("subject"),
        product_details=pick("product_details"),
        remarks=pick("remarks"),
        terms_and_conditions=pick("terms_and_conditions"),
        bank_details=pick("bank_details"),
        seller_name=pick("seller_name"),
        seller_designation=pick("seller_designation"),
        seller_company=pick("seller_company"),
        seller_phone=pick("seller_phone"),
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return {
        "id": q.id,
        "buyer_name": q.buyer_name,
        "subject": q.subject,
        "created_at": q.created_at.isoformat() if q.created_at else None,
    }


@router.get("/api/quotation-letters/{letter_id}")
def get_quotation_letter(
    letter_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.QuotationLetter).filter(models.QuotationLetter.id == letter_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return {
        "id": q.id,
        "buyer_name": q.buyer_name,
        "buyer_address": q.buyer_address,
        "subject": q.subject,
        "product_details": q.product_details,
        "remarks": q.remarks,
        "terms_and_conditions": q.terms_and_conditions,
        "bank_details": q.bank_details,
        "seller_name": q.seller_name,
        "seller_designation": q.seller_designation,
        "seller_company": q.seller_company,
        "seller_phone": q.seller_phone,
        "created_at": q.created_at.isoformat() if q.created_at else None,
    }


@router.patch("/api/quotation-letters/{letter_id}")
def update_quotation_letter(
    letter_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.QuotationLetter).filter(models.QuotationLetter.id == letter_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found")

    for field in [
        "buyer_name",
        "buyer_address",
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
            val = (body.get(field) or "").strip()
            setattr(q, field, val or None)

    db.commit()
    db.refresh(q)
    return {"id": q.id}


def _render_pdf(q: models.QuotationLetter) -> bytes:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    x_left = 50
    x_right = width - 50
    body_font = 11
    table_font = 10
    line_height = 17
    font_regular, font_bold = _resolve_pdf_fonts()

    # Header image from provided asset (flush to top)
    y = height
    footer_height = 0
    top_reader = _image_reader(TOP_IMAGE_PATH)
    if top_reader:
        top_w, top_h = top_reader.getSize()
        draw_w = width - 14
        draw_h = draw_w * (top_h / top_w)
        c.drawImage(top_reader, 7, y - draw_h, width=draw_w, height=draw_h, mask="auto")
        y = y - draw_h - 20

    bottom_reader = _image_reader(BOTTOM_IMAGE_PATH)
    if bottom_reader:
        bottom_w, bottom_h = bottom_reader.getSize()
        footer_draw_w = width - 14
        footer_height = footer_draw_w * (bottom_h / bottom_w)

    # ── REF (left) and DATED (right) ──
    today = date.today()
    fy_year = today.year
    fy = f"{fy_year}-{(fy_year + 1) % 100:02d}"
    ref_no = f"{q.id:03d}"

    c.setFont(font_regular, body_font)
    c.drawString(x_left, y, f"Ref: SLTMS/ {fy}/ {ref_no}")
    c.drawRightString(x_right, y, f"Dated: {today.strftime('%d-%m-%Y')}")
    y -= line_height * 1.5

    # ── QUOTATION HEADING ──
    c.setFont(font_bold, 15)
    c.drawCentredString(width / 2, y, "QUOTATION")
    y -= line_height * 1.2

    # Text width for body copy (same as left/right margins)
    content_width = x_right - x_left

    # ── TO BLOCK ──
    c.setFont(font_regular, body_font)
    c.drawString(x_left, y, "To,")
    y -= line_height
    if q.buyer_name:
        c.setFont(font_bold, body_font)
        name = _pdf_safe((q.buyer_name or "").strip())
        if name:
            for wrapped in simpleSplit(name, font_bold, body_font, content_width):
                c.drawString(x_left, y, wrapped)
                y -= line_height
        c.setFont(font_regular, body_font)
    if q.buyer_address:
        c.setFont(font_regular, body_font)
        for line in (q.buyer_address or "").splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            for wrapped in simpleSplit(_pdf_safe(stripped), font_regular, body_font, content_width):
                c.drawString(x_left, y, wrapped)
                y -= line_height

    y -= line_height * 0.6
    # ── SUBJECT ──
    if q.subject:
        c.setFont(font_bold, body_font)
        subj = _pdf_safe(f"Sub: {q.subject}".strip())
        for wrapped in simpleSplit(subj, font_bold, body_font, content_width):
            c.drawString(x_left, y, wrapped)
            y -= line_height
        c.setFont(font_regular, body_font)
        y -= line_height * 0.4

    c.drawString(x_left, y, "Dear Sir,")
    y -= line_height
    c.drawString(
        x_left, y,
        "As per telephonic conversation, please find below rates for items discussed \u2013",
    )
    y -= line_height * 1.15

    # ── PRODUCT DETAILS TABLE ──
    product_rows = _parse_product_rows(q.product_details or "")
    table = Table(product_rows, colWidths=[55, 240, 70, 105], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), font_bold),
                ("FONTNAME", (0, 1), (-1, -1), font_regular),
                ("FONTSIZE", (0, 0), (-1, -1), table_font),
                ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
                ("GRID", (0, 0), (-1, -1), 0.6, colors.black),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    available_height = max(120, y - (footer_height + 80))
    _, table_h = table.wrapOn(c, width - 100, available_height)
    table.drawOn(c, x_left, y - table_h)
    y = y - table_h - 20

    # ── REMARKS ──
    if q.remarks:
        c.setFont(font_bold, body_font)
        c.drawString(x_left, y, "Remarks \u2013")
        c.setFont(font_regular, body_font)
        y -= line_height
        for line in q.remarks.splitlines():
            if line.strip():
                wrapped_lines = simpleSplit(_pdf_safe(line.strip()), font_regular, body_font, width - 110)
                for wrapped_line in wrapped_lines:
                    c.drawString(x_left, y, wrapped_line)
                    y -= line_height * 0.95
        y -= line_height * 0.6

    # ── TERMS AND CONDITIONS ──
    c.setFont(font_bold, body_font)
    c.drawString(x_left, y, "Terms and Conditions \u2013")
    c.setFont(font_regular, body_font)
    y -= line_height
    if q.terms_and_conditions:
        for line in q.terms_and_conditions.splitlines():
            if line.strip():
                wrapped_lines = simpleSplit(_pdf_safe(line.strip()), font_regular, body_font, width - 110)
                for wrapped_line in wrapped_lines:
                    c.drawString(x_left, y, wrapped_line)
                    y -= line_height * 0.95

    y -= line_height * 1.2
    c.drawString(x_left, y, "For any clarification or order confirmation, please feel free to contact us.")
    y -= line_height * 1.3
    c.drawString(x_left, y, "Thanks and Regards")
    y -= line_height * 1.4

    # ── SELLER DETAILS (bold) ──
    c.setFont(font_bold, body_font)
    if q.seller_name:
        c.drawString(x_left, y, q.seller_name)
        y -= line_height
    if q.seller_designation:
        c.drawString(x_left, y, q.seller_designation)
        y -= line_height
    if q.seller_company:
        c.drawString(x_left, y, q.seller_company)
        y -= line_height
    if q.seller_phone:
        c.setFont(font_regular, body_font)
        c.drawString(x_left, y, q.seller_phone)
        y -= line_height

    # ── BANK DETAILS BOX ──
    if q.bank_details:
        y -= line_height * 0.6
        c.setFont(font_bold, body_font)
        c.drawString(x_left, y, "Bank Details:")
        y -= line_height * 0.9
        box_height = 70
        c.rect(x_left, y - box_height + 10, width - 100, box_height, stroke=1, fill=0)
        c.setFont(font_regular, body_font)
        text_y = y
        for line in q.bank_details.splitlines():
            if line.strip():
                wrapped_lines = simpleSplit(_pdf_safe(line.strip()), font_regular, body_font, width - 120)
                for wrapped_line in wrapped_lines:
                    c.drawString(x_left + 8, text_y, wrapped_line)
                    text_y -= line_height * 0.9

    # Footer image from provided asset
    if bottom_reader and footer_height:
        draw_w = width - 14
        c.drawImage(bottom_reader, 7, 7, width=draw_w, height=footer_height, mask="auto")

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.getvalue()


@router.get("/api/quotation-letters/{letter_id}/pdf")
def download_quotation_letter_pdf(
    letter_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.QuotationLetter).filter(models.QuotationLetter.id == letter_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found")
    pdf_bytes = _render_pdf(q)
    filename = f"Quotation-{letter_id:03d}.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
