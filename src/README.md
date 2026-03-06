# ERP SaaS – Full-Stack Application

A multi-module **ERP SaaS** application with **Python (FastAPI)** backend and **React (TypeScript)** frontend. This document summarizes all implemented features and how to run and use the application.

---

## Summary of Changes

### 1. Core Platform & Tenant Management

- **Organizations & branches**
  - **Models:** `Organization`, `Branch` (in `backend/models/erp_models.py`).
  - **API:** `GET/POST /api/organizations`, `GET/POST/PATCH/DELETE /api/organizations/:id`; `GET/POST /api/branches`, `GET/POST/PATCH/DELETE /api/branches/:id`.
  - **UI:** **Organizations** page lists organizations and branches.

- **Role-based access control (RBAC)**
  - **Models:** `Role`, `Permission`, `role_permissions` (many-to-many), `UserOrganization`.
  - **API:** `GET/POST /api/roles`, `GET/PATCH/DELETE /api/roles/:id`; `GET /api/permissions`. User management: `GET/POST/PATCH/DELETE /api/users` (admin only).
  - **Seeding:** Default permissions (e.g. `orders:view`, `finance:view`, `admin:users`) and a default organization are seeded on first run.

- **Audit logs**
  - **Model:** `AuditLog` (user, action, resource_type, resource_id, old/new value, IP, timestamp).
  - **API:** `GET /api/audit-logs` with optional filters (resource_type, action, limit, offset).
  - **Helper:** `log_audit()` in `backend/routers/audit.py` for use in other routers.

- **User management**
  - **API:** List/create/update/delete users at `/api/users` (admin only). Existing login and JWT auth unchanged.

- **Master data**
  - **Existing:** Customers, Products (with new **Reorder level** for inventory alerts).
  - **New:** Chart of Accounts (see Finance).

---

### 2. Finance & Accounting

- **General Ledger**
  - **Models:** `ChartOfAccount`, `JournalEntry`, `JournalLine`.
  - **API:** `GET/POST /api/chart-of-accounts`; `GET/POST /api/journal-entries`, `POST /api/journal-entries/:id/post`.

- **Trial Balance**
  - **API:** `GET /api/finance/trial-balance?as_of=YYYY-MM-DD`.

- **P&L and Balance Sheet**
  - **API:** `GET /api/finance/profit-loss?from_date=&to_date=`, `GET /api/finance/balance-sheet?as_of=`.

- **Accounts Payable / Receivable**
  - **API:** `GET /api/finance/accounts-receivable`, `GET /api/finance/accounts-payable` (optional customer_id/vendor_id).

- **Invoice & payment tracking**
  - **Models:** `SalesInvoice`, `Payment` (receipt/payment, link to customer/vendor/invoice).
  - **API:** `GET/POST /api/sales-invoices`, `POST /api/sales-invoices/:id/post`; `GET/POST /api/payments`.

- **Basic tax (GST)**
  - Handled at order/invoice level (existing order fields: `cgst_percent`, `sgst_percent`, `igst_percent`; can be reflected in journal entries when implemented).

- **Bank reconciliation**
  - **Models:** `BankAccount`, `BankStatementLine` (reconciled, matched_to).
  - **API:** `GET/POST /api/bank-accounts`, `GET/POST /api/bank-accounts/:id/statement`, `PATCH /api/bank-statement-lines/:id/reconcile`.

---

### 3. Sales

- **Lead to customer**
  - Existing **Customers** model and UI support lead fields (`is_lead`, `lead_status`, `lead_source`, etc.); conversion is via status/editing.

- **Quotation**
  - **Models:** `Quotation`, `QuotationItem`.
  - **API:** `GET/POST /api/quotations` (with items).
  - **UI:** **Quotations** page.

- **Sales Order**
  - Existing **Orders** module acts as Sales Order.

- **Invoice**
  - **Sales Invoices:** `GET/POST /api/sales-invoices`, post to finalize.

- **Delivery tracking**
  - **Models:** `DeliveryNote`, `DeliveryNoteItem`.
  - **API:** `GET/POST /api/delivery-notes` (linked to order).

- **Customer ledger**
  - **API:** `GET /api/customer-ledger?customer_id=` (invoices and payments with running balance).

---

### 4. Procurement

- **Purchase Request**
  - **Models:** `PurchaseRequest`, `PurchaseRequestItem`.
  - **API:** `GET/POST /api/purchase-requests`.

- **Purchase Order**
  - **Models:** `PurchaseOrder`, `PurchaseOrderItem`.
  - **API:** `GET/POST /api/purchase-orders`.

- **Goods Receipt**
  - **Models:** `GoodsReceipt`, `GoodsReceiptItem`.
  - **API:** `GET/POST /api/goods-receipts`.

- **Vendor**
  - **Model:** `Vendor`.
  - **API:** `GET/POST /api/vendors`, `PATCH /api/vendors/:id`.

- **Vendor invoice & 3-way match**
  - **Models:** `VendorInvoice`, `VendorInvoiceLine` (with `match_status`).
  - **API:** `GET/POST /api/vendor-invoices`, `GET /api/vendor-invoices/:id/match-status`, `POST /api/vendor-invoices/:id/match`.

- **UI:** **Procurement** page (tabs: Vendors, PR, PO, Vendor Invoices).

---

### 5. Inventory

- **Stock in / out**
  - **Model:** `StockMovement` (type: in, out, adjustment; quantity signed).
  - **API:** `GET/POST /api/stock-movements`. Product `stock` is updated on movement (single-warehouse mode).

- **Warehouse management**
  - **Models:** `Warehouse`, `ProductWarehouse` (optional multi-warehouse).
  - **API:** `GET/POST /api/warehouses`.

- **Stock valuation**
  - **API:** `GET /api/inventory/valuation` (product × price).

- **Reorder alerts**
  - **Product:** New field `reorder_level`. **API:** `GET /api/inventory/reorder-alerts`.

- **Stock report**
  - **API:** `GET /api/inventory/stock-report`.

- **UI:** **Warehouses** page (warehouses, valuation, reorder alerts, stock report).

---

### 6. Reporting & Dashboard

- **Financial reports**
  - **API:** `GET /api/reports/financial-summary`, `GET /api/finance/trial-balance`, `GET /api/finance/profit-loss`, `GET /api/finance/balance-sheet`.

- **Sales reports**
  - **API:** `GET /api/reports/sales-summary`; export: `GET /api/reports/export/sales` (CSV).

- **Inventory reports**
  - **API:** `GET /api/reports/inventory-summary`; export: `GET /api/reports/export/inventory` (CSV).

- **Export**
  - **CSV:** Sales, Inventory, Trial Balance via `GET /api/reports/export/sales`, `.../export/inventory`, `.../export/trial-balance?as_of=`.
  - **Financial data (JSON):** `GET /api/reports/export/financial-pdf?report_type=pl|bs` (PDF can be added later).

- **Role-based dashboard & sidebar**
  - **Dashboard** page shows KPIs.
  - Sidebar navigation is filtered by user role:
    - **admin** – sees all sections including Users, Organizations.
    - **logistics** – sees Dashboard, Logistics, Logistics Dashboard.
    - **accountant** – sees Dashboard, Finance, Reports.
    - **sales** – sees Dashboard, Orders, Products, Customers, Quotations, Retailer.
    - **staff** – sees most operational sections (Orders, Products, Customers, Quotations, Procurement, Warehouses, Retailer).
  - **Users** page allows admin to **add, edit, delete users** and assign roles.
  - User management APIs (`/api/users`) restricted to **admin** role.

---

### 7. Logistics

- **Logistics entries**
  - **Model:** `Logistics` (order_id, product_name, product_unit, distance, date, created_by, tenant_id).
  - **API:**
    - `GET /api/logistics` – list entries (filter by `from_date`, `to_date`, `product_name`).
    - `POST /api/logistics` – create entry (created_by defaults to current user).
    - `PATCH /api/logistics/:id` – update entry.
    - `DELETE /api/logistics/:id` – delete entry.
  - **UI:** **Logistics** page with add/edit/delete functionality.

- **Logistics Dashboard**
  - **API:** `GET /api/logistics/dashboard/summary` – aggregate summary.
    - `total_entries`, `total_distance`.
    - `by_month` – entries and distance per month.
    - `by_product` – entries and distance per product.
    - `by_distance` – count by distance range (0-50, 50-100, etc.).
  - **UI:** **Logistics Dashboard** page with KPI cards and charts (bar chart by month, pie chart by product, bar chart by distance range).

---

### 8. SaaS Essentials

- **Subscription billing & plan management**
  - **Models:** `SubscriptionPlan`, `TenantSubscription`.
  - **API:** `GET/POST /api/saas/plans`, `GET/POST /api/saas/subscriptions`.

- **Feature toggles per tenant**
  - **Model:** `TenantFeatureToggle`.
  - **API:** `GET/POST /api/saas/feature-toggles` (by organization_id, feature_code, enabled).

- **Usage limits**
  - **Model:** `UsageLog` (organization_id, metric, value, period).
  - **API:** `GET/POST /api/saas/usage`.

- **Backup strategy**
  - **API:** `GET /api/saas/backup/export` (admin; JSON export of metadata); `GET /api/saas/backup/strategy` (returns strategy description).
  - **Recommendation:** Schedule DB dumps (e.g. pg_dump / SQLite backup) and retain offsite.

---

## How to Run

### Prerequisites

- **Node.js** (v18+)
- **Python** 3.10+
- **SQLite** (default) or **PostgreSQL** (set `DATABASE_URL`)

### Backend (Python)

```bash
cd backend
pip install -r requirements.txt
# Optional: set DATABASE_URL for PostgreSQL
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8080
# Or from repo root:
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8080
```

- Backend creates all tables and seeds default permissions and one organization on startup.
- Default login: **admin** / **admin123** (change in production).

### Frontend (React + Vite)

```bash
npm install
npm run dev
```

- Frontend runs on port **5000** and proxies `/api` to **http://localhost:8080**.

### Full stack (single command)

From repo root:

```bash
# Terminal 1 – backend
python -m uvicorn backend.main:app --reload --port 8080

# Terminal 2 – frontend
npm run dev
```

Then open **http://localhost:5000**, log in with **admin** / **admin123**, and use the sidebar to access Dashboard, Orders, Products, Customers, Quotations, Finance, Procurement, Warehouses, Reports, Retailer, Organizations, and (as admin) Users.

---

## How to Use

1. **Login**  
   Use **admin** / **admin123** (or any user created via **Users** by an admin).

2. **Organizations & branches**  
   Go to **Organizations** to view (and, via API, create) organizations and branches. Default org is created on first run.

3. **Finance**  
   - **Chart of Accounts:** Add accounts (asset, liability, equity, revenue, expense) via API or a future UI.
   - **Journal entries:** Create and post journals via API; view Trial Balance, P&L, Balance Sheet and AR on the **Finance** page.
   - **Bank:** Create bank accounts and statement lines via API; reconcile via `PATCH .../bank-statement-lines/:id/reconcile`.

4. **Sales**  
   Use **Orders** for sales orders; **Quotations** for quotations; create **Sales Invoices** and **Delivery Notes** via API. **Customer ledger** is available at `GET /api/customer-ledger?customer_id=`.

5. **Procurement**  
   Use **Procurement** page for Vendors, Purchase Requests, Purchase Orders, and Vendor Invoices. Use match APIs for 3-way matching.

6. **Inventory**  
   Use **Products** (with reorder level) and **Warehouses** for stock, valuation, reorder alerts, and stock report. Post **Stock movements** via API.

7. **Reports**  
   Use **Reports** for summary KPIs and **Export** buttons to download Sales, Inventory, and Trial Balance CSV (auth via session).

8. **SaaS**  
   Use **Plans**, **Subscriptions**, **Feature toggles**, and **Usage** APIs; **Backup export** (admin) and **Backup strategy** as described above.

---

## Tech Stack

- **Backend:** Python, FastAPI, SQLAlchemy, SQLite/PostgreSQL, JWT (jose), bcrypt.
- **Frontend:** React, TypeScript, Vite, Wouter, TanStack Query, Tailwind, shadcn-style UI.
- **Shared:** `shared/schema.ts`, `shared/routes.ts` (Zod/Drizzle-style types and route map).

All new backend code stays within the **Python** stack as requested.
