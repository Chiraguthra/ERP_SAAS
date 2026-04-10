"""
WhatsApp webhook: receives incoming messages, parses text for actions
(ADD CUSTOMER, ADD PRODUCT, CREATE ORDER) and executes them.
Supports WhatsApp Cloud API payload format and a simple { "message": "text" } format.

Configure Meta webhook URL (GET + POST):
  {PUBLIC_BASE_URL}/api/whatsapp/webhook
Set the same Verify Token in Meta as env WEBHOOK_VERIFY_TOKEN.
For outbound replies, set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN.
"""
import os
import re
import uuid
import logging
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from ..db.database import get_db
from ..models import models
from .customers import _payload_to_model_dict as _customer_payload_to_model, _customer_to_response
from .orders import (
    _order_to_response,
    _order_item_to_response,
    _safe_float,
)

router = APIRouter()

logger = logging.getLogger(__name__)

WEBHOOK_VERIFY_TOKEN = os.getenv("WEBHOOK_VERIFY_TOKEN", "retailer-webhook-verify")
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "")  # Optional: set to validate incoming POST signature
WHATSAPP_GRAPH_VERSION = os.getenv("WHATSAPP_GRAPH_VERSION", "v21.0")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "").strip()
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "").strip()

GREETING_REPLY = """Thank you for reaching out to us. 🙏
We are a one-stop destination for all your construction & project management needs — from planning to execution, we handle it all with precision and quality.
🏗️ Our Core Services:
✅ Project Planning & Scheduling
✅ Quantity Surveying, Estimation & Costing
✅ Quality Assurance & Control
✅ Vendor Management
✅ Owner's Representation
✅ Resource Monitoring & Mobilization
✅ Bid Proposals & Consultancy
Whether you're building a home, managing a commercial site, or looking for expert techno-management support — SilverLine is here to make your project a success.
💡 We bring expertise, transparency, and accountability to every project we touch.
📞 Call us: +91 99625 87081
📧 info@silverlinetm.com
🌐 silverlinetm.com
How can we assist you today? 😊"""


def _extract_message_text(body: Any) -> Optional[str]:
    """Extract plain text from WhatsApp Cloud API payload or simple { message: "..." }."""
    if not body or not isinstance(body, dict):
        return None
    # Simple format: { "message": "ADD CUSTOMER\n..." } or { "text": "..." }
    if "message" in body and isinstance(body["message"], str):
        return body["message"].strip()
    if "text" in body and isinstance(body["text"], str):
        return body["text"].strip()
    # WhatsApp Cloud API: entry[].changes[].value.messages[].text.body
    entries = body.get("entry") or []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        for change in entry.get("changes") or []:
            value = (change or {}).get("value") or {}
            for msg in value.get("messages") or []:
                text_obj = (msg or {}).get("text") or {}
                if isinstance(text_obj.get("body"), str):
                    return text_obj["body"].strip()
    return None


def _iter_cloud_incoming_text_messages(body: Any) -> list[tuple[str, str]]:
    """Extract (whatsapp_from_id, text_body) for each incoming user text message (Cloud API)."""
    out: list[tuple[str, str]] = []
    if not body or not isinstance(body, dict):
        return out
    for entry in body.get("entry") or []:
        if not isinstance(entry, dict):
            continue
        for change in entry.get("changes") or []:
            value = (change or {}).get("value") or {}
            for msg in value.get("messages") or []:
                if not isinstance(msg, dict):
                    continue
                if msg.get("type") != "text":
                    continue
                wa_from = msg.get("from")
                if not wa_from:
                    continue
                text_obj = (msg.get("text") or {})
                body_text = (text_obj.get("body") or "").strip() if isinstance(text_obj, dict) else ""
                if body_text:
                    out.append((str(wa_from), body_text))
    return out


def _is_greeting(text: str) -> bool:
    """True for common short greetings (hi, hello, good morning, namaste, etc.)."""
    raw = (text or "").strip().lower()
    if not raw:
        return False
    # normalize spaces / zero-width
    t = re.sub(r"[\s\u200c\u200d]+", " ", raw)
    t = re.sub(r"[.,!?\u2026]+$", "", t).strip()
    if not t:
        return False
    # strip leading emoji / punctuation
    t = re.sub(r"^[\s\W_]+", "", t, flags=re.UNICODE).strip()
    if not t:
        return False

    greeting_tokens = {
        "hi", "hii", "hai", "hey", "hello", "hallo", "hola", "yo", "gm", "ga", "ge", "gn",
        "namaste", "namaskar", "namashkar", "sir", "madam", "dear",
    }
    good_day = {"morning", "afternoon", "evening", "night", "day"}
    words = t.split()
    first = words[0]

    if re.match(r"^h+i+[!.,?$]*$", first, re.IGNORECASE):
        return True
    if first in greeting_tokens:
        return True
    if first in ("good", "gud") and len(words) >= 2 and words[1] in good_day:
        return True
    if t in ("hi", "hello", "hey", "namaste"):
        return True
    # "hi there", "hello team"
    if first in ("hi", "hello", "hey") and len(words) <= 4:
        return True
    return False


async def _send_whatsapp_text(to_wa_id: str, body: str) -> tuple[bool, str]:
    """
    Send a text message via WhatsApp Cloud API.
    to_wa_id: digits only, country code, no + (e.g. 9199xxxxxxxx).
    """
    if not WHATSAPP_PHONE_NUMBER_ID or not WHATSAPP_ACCESS_TOKEN:
        logger.warning("WhatsApp reply skipped: set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN")
        return False, "WhatsApp API not configured"
    url = f"https://graph.facebook.com/{WHATSAPP_GRAPH_VERSION}/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to_wa_id,
        "type": "text",
        "text": {"preview_url": False, "body": body},
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(url, headers=headers, json=payload)
    except Exception as e:
        logger.exception("WhatsApp Graph API request failed")
        return False, str(e)
    if r.status_code >= 300:
        err = r.text[:800] if r.text else ""
        logger.error("WhatsApp Graph API error %s: %s", r.status_code, err)
        return False, f"HTTP {r.status_code}: {err}"
    return True, "sent"


def _parse_key_value_lines(text: str) -> dict[str, str]:
    """Parse lines like 'Key: value' or 'Key : value' into a dict (keys lowercased, stripped)."""
    result: dict[str, str] = {}
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        # Match "Key: value" or "Key : value"
        m = re.match(r"^([^:]+)\s*:\s*(.*)$", line, re.IGNORECASE)
        if m:
            key = m.group(1).strip().lower().replace(" ", "_")
            value = m.group(2).strip()
            if key:
                result[key] = value
    return result


def _parse_action_and_body(text: str) -> tuple[str, str]:
    """First line = action (e.g. ADD CUSTOMER), rest = body. Returns (action_upper, body)."""
    lines = text.strip().splitlines()
    if not lines:
        return "", ""
    action = lines[0].strip().upper()
    body = "\n".join(lines[1:]).strip() if len(lines) > 1 else ""
    return action, body


def _parse_customer(body: str) -> dict[str, Any]:
    """Parse body as key-value pairs for customer. Returns snake_case payload for _payload_to_model_dict input (API uses camelCase; we pass snake_case which matches model)."""
    kv = _parse_key_value_lines(body)
    # Map common keys to model attrs (snake_case)
    payload: dict[str, Any] = {}
    str_keys = [
        "name", "company", "address", "city", "state", "country", "phone", "email", "email_id",
        "contact_person", "gstin", "pan", "website", "status", "location"
    ]
    for k in str_keys:
        if k in kv and kv[k]:
            payload[k] = kv[k]
    if "email" in payload and "email_id" not in payload:
        payload["email_id"] = payload["email"]
    if "pin_code" in kv and kv["pin_code"]:
        try:
            payload["pin_code"] = int(kv["pin_code"].replace(",", "").strip())
        except ValueError:
            pass
    if "pincode" in kv and kv["pincode"] and "pin_code" not in payload:
        try:
            payload["pin_code"] = int(kv["pincode"].replace(",", "").strip())
        except ValueError:
            pass
    return payload


def _parse_product(body: str) -> dict[str, Any]:
    """Parse body as key-value for product. Returns dict suitable for ProductCreate / model."""
    kv = _parse_key_value_lines(body)
    payload: dict[str, Any] = {}
    if kv.get("name"):
        payload["name"] = kv["name"].strip()
    if kv.get("price") is not None:
        try:
            payload["price"] = float(kv["price"].replace(",", "").strip())
        except ValueError:
            payload["price"] = 0.0
    if kv.get("unit"):
        payload["unit"] = kv["unit"].strip()
    if kv.get("sku"):
        payload["sku"] = kv["sku"].strip()
    if kv.get("stock") is not None:
        try:
            payload["stock"] = float(kv["stock"].replace(",", "").strip())
        except ValueError:
            payload["stock"] = 0.0
    if kv.get("description") is not None:
        payload["description"] = kv["description"].strip()
    return payload


def _parse_order(body: str, db: Session) -> tuple[Optional[int], list[tuple[int, int, Optional[float]]], float, float, float, float, float]:
    """
    Parse order body. Returns (customer_id, [(product_id, qty, price?), ...], freight, adjustments, cgst, sgst, igst).
    Customer can be "Customer: 1" (id) or "Customer: ABC Ltd" (name lookup).
    Items: "Item: productId quantity" or "Item: productId quantity rate" per line.
    """
    kv = _parse_key_value_lines(body)
    customer_id: Optional[int] = None
    customer_val = (kv.get("customer") or kv.get("customer_id") or "").strip()
    if customer_val:
        try:
            customer_id = int(customer_val)
        except ValueError:
            name = customer_val
            c = db.query(models.Customer).filter(
                (models.Customer.name == name) | (models.Customer.company == name)
            ).first()
            if c:
                customer_id = c.id

    items: list[tuple[int, int, Optional[float]]] = []
    for line in body.splitlines():
        line_stripped = line.strip()
        if not line_stripped or not line_stripped.upper().startswith("ITEM:"):
            continue
        rest = line_stripped[5:].strip()
        parts = rest.split()
        if len(parts) >= 2:
            try:
                pid = int(parts[0])
                qty = int(parts[1])
                rate = float(parts[2]) if len(parts) >= 3 else None
                if qty > 0:
                    items.append((pid, qty, rate))
            except ValueError:
                pass

    freight = 0.0
    if kv.get("freight") is not None:
        try:
            freight = float(kv["freight"].replace(",", "").strip())
        except ValueError:
            pass
    adjustments = 0.0
    if kv.get("adjustments") is not None:
        try:
            adjustments = float(kv["adjustments"].replace(",", "").strip())
        except ValueError:
            pass
    cgst = 0.0
    sgst = 0.0
    igst = 0.0
    if kv.get("cgst") is not None:
        try:
            cgst = float(kv["cgst"].replace(",", "").strip())
        except ValueError:
            pass
    if kv.get("sgst") is not None:
        try:
            sgst = float(kv["sgst"].replace(",", "").strip())
        except ValueError:
            pass
    if kv.get("igst") is not None:
        try:
            igst = float(kv["igst"].replace(",", "").strip())
        except ValueError:
            pass

    return customer_id, items, freight, adjustments, cgst, sgst, igst


@router.get("/whatsapp/webhook")
async def whatsapp_verify(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
):
    """WhatsApp Cloud API webhook verification: return hub.challenge as plain text if token matches."""
    if hub_mode == "subscribe" and hub_verify_token == WEBHOOK_VERIFY_TOKEN and hub_challenge is not None:
        return PlainTextResponse(content=str(hub_challenge))
    raise HTTPException(status_code=403, detail="Verification failed")


def _run_erp_whatsapp_action(text: str, db: Session) -> dict:
    """Execute ERP command from message text; raises HTTPException on validation errors."""
    action, body_text = _parse_action_and_body(text)

    if not action:
        return {"status": "ignored", "reason": "empty_message"}

    # ----- ADD CUSTOMER -----
    if action in ("ADD CUSTOMER", "ADD CUSTOMERS", "NEW CUSTOMER"):
        payload = _parse_customer(body_text)
        if not payload.get("name") and not payload.get("company") and not payload.get("contact_person"):
            raise HTTPException(
                status_code=400,
                detail="At least one of Name, Company or Contact Person is required for ADD CUSTOMER.",
            )
        data = _customer_payload_to_model(payload)
        if not data:
            data = {k: v for k, v in payload.items() if v is not None and (str(v).strip() if isinstance(v, str) else True)}
        if not data:
            raise HTTPException(status_code=400, detail="No valid customer fields provided.")
        db_customer = models.Customer(**data)
        db.add(db_customer)
        try:
            db.commit()
            db.refresh(db_customer)
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=409, detail="A customer with this name already exists.")
        return {"status": "ok", "action": "add_customer", "customer": _customer_to_response(db_customer)}

    # ----- ADD PRODUCT -----
    if action in ("ADD PRODUCT", "ADD PRODUCTS", "NEW PRODUCT", "CREATE PRODUCT"):
        payload = _parse_product(body_text)
        if not payload.get("name"):
            raise HTTPException(status_code=400, detail="Product Name is required for ADD PRODUCT.")
        name = (payload.get("name") or "").strip() or ""
        sku = (payload.get("sku") or "").strip() or f"SKU-{uuid.uuid4().hex[:8]}"
        price = payload.get("price")
        if price is None:
            price = 0.0
        else:
            try:
                price = float(price)
            except (TypeError, ValueError):
                price = 0.0
        stock = payload.get("stock")
        if stock is None:
            stock = 0.0
        else:
            try:
                stock = float(stock)
            except (TypeError, ValueError):
                stock = 0.0
        description = (payload.get("description") or "").strip() or None
        unit = (payload.get("unit") or "").strip() or None
        db_product = models.Product(
            name=name,
            sku=sku,
            price=price,
            stock=stock,
            description=description,
            unit=unit,
        )
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        from .products import _product_to_response

        return {"status": "ok", "action": "add_product", "product": _product_to_response(db_product)}

    # ----- CREATE ORDER -----
    if action in ("CREATE ORDER", "NEW ORDER", "ADD ORDER"):
        customer_id, items, freight, adjustments, cgst_pct, sgst_pct, igst_pct = _parse_order(body_text, db)
        if customer_id is None:
            raise HTTPException(status_code=400, detail="Customer is required (use Customer: <id> or Customer: <name>).")
        cust = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
        if not cust:
            raise HTTPException(status_code=404, detail=f"Customer with id {customer_id} not found.")
        if not items:
            raise HTTPException(status_code=400, detail="At least one Item is required (Item: productId quantity).")

        subtotal = 0.0
        item_rows: list[tuple[int, int, float]] = []
        for product_id, qty, rate_override in items:
            prod = db.query(models.Product).filter(models.Product.id == product_id).first()
            if not prod:
                raise HTTPException(status_code=400, detail=f"Product {product_id} not found.")
            stock_val = _safe_float(prod.stock)
            if stock_val < qty:
                raise HTTPException(
                    status_code=400,
                    detail=f"Low stock for product '{prod.name or product_id}' (available: {stock_val}).",
                )
            rate = _safe_float(rate_override) if rate_override is not None else _safe_float(prod.price)
            line_total = rate * qty
            subtotal += line_total
            item_rows.append((product_id, qty, rate))
            prod.stock = stock_val - qty

        taxable_base = subtotal + freight
        cgst_amt = taxable_base * (cgst_pct / 100)
        sgst_amt = taxable_base * (sgst_pct / 100)
        igst_amt = taxable_base * (igst_pct / 100)
        total = taxable_base + cgst_amt + sgst_amt + igst_amt - adjustments

        db_order = models.Order(
            customer_id=customer_id,
            total_amount=total,
            status="pending",
            bill_id=None,
            freight_charges=freight,
            adjustments=adjustments,
            cgst_percent=cgst_pct if cgst_pct else None,
            sgst_percent=sgst_pct if sgst_pct else None,
            igst_percent=igst_pct if igst_pct else None,
        )
        db.add(db_order)
        db.commit()
        db.refresh(db_order)

        for product_id, qty, price in item_rows:
            db_item = models.OrderItem(order_id=db_order.id, product_id=product_id, quantity=qty, price=price)
            db.add(db_item)
        db.commit()
        db.refresh(db_order)
        out = _order_to_response(db_order)
        out["items"] = [_order_item_to_response(i) for i in db_order.items]
        return {"status": "ok", "action": "create_order", "order": out}

    return {"status": "ignored", "reason": "unknown_action", "action_received": action}


@router.post("/whatsapp/webhook")
async def whatsapp_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Receive incoming WhatsApp message (Cloud API or simple { "message": "text" }).
    Replies to greetings via Cloud API; otherwise runs ADD CUSTOMER / ADD PRODUCT / CREATE ORDER.
    Returns 200 for Cloud deliveries so Meta does not retry indefinitely.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    cloud_messages = _iter_cloud_incoming_text_messages(body)
    results: list[dict] = []

    if cloud_messages:
        for wa_id, msg_text in cloud_messages:
            if _is_greeting(msg_text):
                ok, detail = await _send_whatsapp_text(wa_id, GREETING_REPLY)
                results.append({"from": wa_id, "handled": "greeting", "sent": ok, "detail": detail})
                continue
            try:
                erp = _run_erp_whatsapp_action(msg_text, db)
                results.append({"from": wa_id, "handled": "erp", "result": erp})
            except HTTPException as he:
                db.rollback()
                err_txt = he.detail if isinstance(he.detail, str) else "Request could not be completed."
                await _send_whatsapp_text(wa_id, f"⚠️ {err_txt}")
                results.append({"from": wa_id, "handled": "erp_error", "detail": err_txt})
        return {"status": "ok", "results": results}

    text = _extract_message_text(body)
    if not text:
        return {"status": "ignored", "reason": "no_message_text"}

    if _is_greeting(text):
        return {
            "status": "ok",
            "handled": "greeting",
            "note": "Use Meta webhook to receive sender id; set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID to send replies.",
            "would_reply_with": GREETING_REPLY,
        }

    try:
        return _run_erp_whatsapp_action(text, db)
    except HTTPException:
        raise
