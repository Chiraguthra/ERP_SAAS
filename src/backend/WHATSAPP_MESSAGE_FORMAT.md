# WhatsApp Message Format for Retailer Hub API

The backend exposes a webhook at **POST /api/whatsapp/webhook** that accepts incoming WhatsApp messages (or any JSON with a `message` or `text` field), parses the first line as an **action**, and the rest as **key: value** lines.

---

## Supported actions

- **ADD CUSTOMER** – Create a new customer
- **ADD PRODUCT** / **CREATE PRODUCT** – Create a new product
- **CREATE ORDER** / **NEW ORDER** – Create an order for a customer with line items

The first line of the message must be exactly one of these (case insensitive). The following lines are parsed as `Key: value` pairs.

---

## 1. ADD CUSTOMER

**Format:** First line = `ADD CUSTOMER`, then one line per field using `Key: value`.

**Required:** At least one of **Name**, **Company**, or **Contact Person**.

**Optional keys (any mix of):**

| Key           | Example        | Notes                    |
|---------------|----------------|--------------------------|
| Name          | ABC Traders    | Display name             |
| Company       | ABC Ltd        | Business name            |
| Contact Person| John Doe       | Contact name             |
| Phone         | +919876543210  |                          |
| Email         | abc@example.com | Or use Email Id        |
| Address       | 123 Street, City | Full or partial address |
| City          | Bangalore      |                          |
| State         | Karnataka      |                          |
| Pin Code      | 560001         | Numeric, no commas       |
| Country       | India          |                          |
| GSTIN         | 29XXXXX...     |                          |
| PAN           | XXXXX1234X     |                          |
| Website       | https://...    |                          |
| Location      | HQ             |                          |
| Status        | Active         |                          |

**Example message:**

```
ADD CUSTOMER
Name: ABC Traders
Company: ABC Ltd
Phone: +919876543210
Email: abc@example.com
Address: 123 MG Road, Bangalore
City: Bangalore
State: Karnataka
Pin Code: 560001
Country: India
GSTIN: 29AABCU9603R1ZM
```

**Response:** `{ "status": "ok", "action": "add_customer", "customer": { ... } }`  
**Errors:** 400 if no name/company/contact person; 409 if a customer with that name already exists.

---

## 2. ADD PRODUCT / CREATE PRODUCT

**Format:** First line = `ADD PRODUCT` (or `CREATE PRODUCT`), then key-value lines.

**Required:** **Name**.

**Optional keys:**

| Key         | Example   | Notes                          |
|-------------|-----------|--------------------------------|
| Name        | Widget A  | **Required**                   |
| Price       | 99.50     | Numeric; default 0             |
| Unit        | pcs       | e.g. pcs, kg, box              |
| SKU         | WID-A     | Auto-generated if omitted      |
| Stock       | 100       | Numeric; default 0             |
| Description | Short text| Optional                       |

**Example message:**

```
ADD PRODUCT
Name: Widget A
Price: 99.50
Unit: pcs
SKU: WID-A
Stock: 100
```

**Response:** `{ "status": "ok", "action": "add_product", "product": { ... } }`  
**Errors:** 400 if Name is missing.

---

## 3. CREATE ORDER / NEW ORDER

**Format:** First line = `CREATE ORDER` (or `NEW ORDER`), then key-value lines. You must specify **Customer** and at least one **Item** line.

**Required:**

- **Customer:** Customer ID (number) or customer name (exact match with `customers.name` or `customers.company`).
- **Item:** One or more lines in the form `Item: <productId> <quantity>` or `Item: <productId> <quantity> <rate>` (rate optional; if omitted, product’s current price is used).

**Optional keys:**

| Key         | Example | Notes                              |
|-------------|---------|------------------------------------|
| Customer    | 1       | Or: ABC Ltd (name/company)         |
| Item        | 1 2     | Product ID 1, quantity 2           |
| Item        | 2 5 50  | Product ID 2, qty 5, rate 50       |
| Freight     | 100     | Numeric; default 0                 |
| Adjustments | 50      | Discount/adjustment; default 0     |
| CGST        | 9       | Percent; default 0                 |
| SGST        | 9       | Percent; default 0                 |
| IGST        | 0       | Percent; default 0                 |

**Example message:**

```
CREATE ORDER
Customer: ABC Ltd
Item: 1 2
Item: 2 5 50
Freight: 100
Adjustments: 50
CGST: 9
SGST: 9
```

**Response:** `{ "status": "ok", "action": "create_order", "order": { ... } }`  
**Errors:**

- 400 if Customer or Items are missing or invalid.
- 404 if customer not found.
- 400 if a product is not found or stock is insufficient (message indicates which product and available stock).

---

## Webhook endpoint and payload

- **URL:** `POST /api/whatsapp/webhook`
- **Verification (WhatsApp Cloud API):** `GET /api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<challenge>`  
  Set `WEBHOOK_VERIFY_TOKEN` in the environment to match `hub.verify_token` (default: `retailer-webhook-verify`).

**Accepted POST body shapes:**

1. **Simple (for testing or custom middleware):**
   - `{ "message": "ADD CUSTOMER\nName: X\n..." }`
   - `{ "text": "ADD CUSTOMER\nName: X\n..." }`

2. **WhatsApp Cloud API:** Standard payload with `entry[].changes[].value.messages[].text.body`; the `body` string is used as the message text (same format as above).

If no message text is found, the API returns `{ "status": "ignored", "reason": "no_message_text" }`. If the first line is not a supported action, it returns `{ "status": "ignored", "reason": "unknown_action", "action_received": "..." }`.

---

## Environment variables

| Variable              | Purpose                                      | Default                    |
|-----------------------|----------------------------------------------|----------------------------|
| `WEBHOOK_VERIFY_TOKEN`| Token for GET webhook verification           | `retailer-webhook-verify`  |
| `WEBHOOK_SECRET`      | Optional: for validating POST request source | (none)                     |

---

## Tips

- Use a **newline** after the first line (action) and between each `Key: value` line.
- Keys are **case insensitive**; spaces before/after the colon are allowed.
- For **CREATE ORDER**, product IDs and customer ID/name must already exist (create customers and products first via WhatsApp or the app).
- Stock is checked when creating an order; if quantity exceeds available stock, the API returns 400 with a clear message.
