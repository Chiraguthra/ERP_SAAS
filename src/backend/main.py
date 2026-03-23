import os
import time
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from .db.database import engine, get_db, Base, is_sqlite
from .models import models
from .models import erp_models  # noqa: F401 - register ERP tables with Base.metadata
from .routers import auth, products, customers, orders, analytics, retailer, whatsapp
from .routers import organizations, branches, users_manage, roles, audit
from .routers import finance, procurement, sales_erp, inventory_erp, reports, saas, logistics, leads, sales_leads
from .routers import quotation_letters, product_price_list


def ensure_tables():
    """Create all tables when app starts. For Docker: retry until DB is ready (e.g. Postgres)."""
    max_attempts = 30
    for attempt in range(1, max_attempts + 1):
        try:
            Base.metadata.create_all(bind=engine)
            break
        except Exception as e:
            if attempt == max_attempts:
                raise RuntimeError(f"Could not create tables after {max_attempts} attempts: {e}") from e
            time.sleep(1)


# Run table creation at module load (backend startup)
ensure_tables()


def seed_erp_defaults():
    """Seed default permissions and one organization if empty."""
    from .db.database import SessionLocal
    db = SessionLocal()
    try:
        if db.query(erp_models.Permission).first() is None:
            for code, name, module in [
                ("orders:view", "View Orders", "orders"),
                ("orders:create", "Create Orders", "orders"),
                ("orders:edit", "Edit Orders", "orders"),
                ("products:view", "View Products", "products"),
                ("products:create", "Create Products", "products"),
                ("customers:view", "View Customers", "customers"),
                ("customers:create", "Create Customers", "customers"),
                ("finance:view", "View Finance", "finance"),
                ("finance:create", "Create Journal Entries", "finance"),
                ("reports:view", "View Reports", "reports"),
                ("admin:users", "Manage Users", "admin"),
                ("admin:orgs", "Manage Organizations", "admin"),
            ]:
                db.add(erp_models.Permission(code=code, name=name, module=module))
            db.commit()
        if db.query(erp_models.Organization).first() is None:
            org = erp_models.Organization(name="Default Organization", slug="default")
            db.add(org)
            db.commit()
            db.refresh(org)
            branch = erp_models.Branch(organization_id=org.id, name="Head Office", code="HO")
            db.add(branch)
            db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


seed_erp_defaults()

# SQLite-only: add columns to existing DBs (PostgreSQL uses create_all with full schema)
if is_sqlite:
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE orders ADD COLUMN bill_id VARCHAR"))
            conn.commit()
    except Exception:
        pass
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE products ADD COLUMN unit VARCHAR"))
            conn.commit()
    except Exception:
        pass
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE products ADD COLUMN reorder_level REAL"))
            conn.commit()
    except Exception:
        pass
else:
    # PostgreSQL: alter products.stock to DOUBLE PRECISION if it was integer
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE products ALTER COLUMN stock TYPE DOUBLE PRECISION USING stock::double precision"))
            conn.commit()
    except Exception:
        pass  # Column may already be double precision
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE products ADD COLUMN reorder_level DOUBLE PRECISION"))
            conn.commit()
    except Exception:
        pass

# Add new customer schema columns to existing customers table (SQLite and PostgreSQL)
_customer_new_columns_sqlite = [
    ("company", "TEXT"),
    ("city", "TEXT"),
    ("state", "TEXT"),
    ("pin_code", "INTEGER"),
    ("country", "TEXT"),
    ("created_on", "DATETIME"),
    ("website", "TEXT"),
    ("email_id", "TEXT"),
    ("contact_person", "TEXT"),
    ("is_lead", "TEXT"),
    ("lead_status", "TEXT"),
    ("lead_source", "TEXT"),
    ("assigned_to", "TEXT"),
    ("client_migration_date", "DATETIME"),
    ("gstin", "TEXT"),
    ("status", "TEXT"),
    ("username", "TEXT"),
    ("lead_close_code", "INTEGER"),
    ("created_by", "TEXT"),
    ("location", "TEXT"),
    ("lead_closed_at", "DATETIME"),
    ("lead_id", "TEXT"),
    ("pan", "TEXT"),
]
_customer_new_columns_pg = [
    ("company", "VARCHAR"),
    ("city", "VARCHAR"),
    ("state", "VARCHAR"),
    ("pin_code", "INTEGER"),
    ("country", "VARCHAR"),
    ("created_on", "TIMESTAMP WITH TIME ZONE"),
    ("website", "VARCHAR"),
    ("email_id", "VARCHAR"),
    ("contact_person", "VARCHAR"),
    ("is_lead", "VARCHAR"),
    ("lead_status", "VARCHAR"),
    ("lead_source", "VARCHAR"),
    ("assigned_to", "VARCHAR"),
    ("client_migration_date", "TIMESTAMP WITH TIME ZONE"),
    ("gstin", "VARCHAR"),
    ("status", "VARCHAR"),
    ("username", "VARCHAR"),
    ("lead_close_code", "INTEGER"),
    ("created_by", "VARCHAR"),
    ("location", "VARCHAR"),
    ("lead_closed_at", "TIMESTAMP WITH TIME ZONE"),
    ("lead_id", "VARCHAR"),
    ("pan", "VARCHAR"),
]
for col_name, col_type in (_customer_new_columns_sqlite if is_sqlite else _customer_new_columns_pg):
    try:
        with engine.connect() as conn:
            conn.execute(text(f"ALTER TABLE customers ADD COLUMN {col_name} {col_type}"))
            conn.commit()
    except Exception:
        pass  # Column already exists

# Enforce unique customer name: normalize empty to NULL then add unique index (existing DBs only)
try:
    with engine.connect() as conn:
        conn.execute(text("UPDATE customers SET name = NULL WHERE name = ''"))
        conn.commit()
except Exception:
    pass
try:
    with engine.connect() as conn:
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_customers_name ON customers (name)"))
        conn.commit()
except Exception:
    pass  # Index may already exist or DB may not support IF NOT EXISTS

# Add order financial columns (freight, adjustments, GST percents)
_order_new_columns_sqlite = [
    ("freight_charges", "REAL"),
    ("adjustments", "REAL"),
    ("cgst_percent", "REAL"),
    ("sgst_percent", "REAL"),
    ("igst_percent", "REAL"),
]
_order_new_columns_pg = [
    ("freight_charges", "NUMERIC"),
    ("adjustments", "NUMERIC"),
    ("cgst_percent", "NUMERIC"),
    ("sgst_percent", "NUMERIC"),
    ("igst_percent", "NUMERIC"),
]
for col_name, col_type in (_order_new_columns_sqlite if is_sqlite else _order_new_columns_pg):
    try:
        with engine.connect() as conn:
            conn.execute(text(f"ALTER TABLE orders ADD COLUMN {col_name} {col_type}"))
            conn.commit()
    except Exception:
        pass  # Column already exists

# Add order reference / dispatch columns
_order_ref_columns_sqlite = [
    ("delivery_note", "TEXT"),
    ("reference_no", "TEXT"),
    ("buyers_order_no", "TEXT"),
    ("dispatch_doc_no", "TEXT"),
    ("dispatched_through", "TEXT"),
    ("mode_terms_of_payment", "TEXT"),
    ("other_references", "TEXT"),
    ("delivery_note_date", "DATETIME"),
    ("destination", "TEXT"),
    ("terms_of_delivery", "TEXT"),
    ("contact_number", "TEXT"),
]
_order_ref_columns_pg = [
    ("delivery_note", "VARCHAR"),
    ("reference_no", "VARCHAR"),
    ("buyers_order_no", "VARCHAR"),
    ("dispatch_doc_no", "VARCHAR"),
    ("dispatched_through", "VARCHAR"),
    ("mode_terms_of_payment", "VARCHAR"),
    ("other_references", "VARCHAR"),
    ("delivery_note_date", "TIMESTAMP WITH TIME ZONE"),
    ("destination", "VARCHAR"),
    ("terms_of_delivery", "VARCHAR"),
    ("contact_number", "VARCHAR"),
]
for col_name, col_type in (_order_ref_columns_sqlite if is_sqlite else _order_ref_columns_pg):
    try:
        with engine.connect() as conn:
            conn.execute(text(f"ALTER TABLE orders ADD COLUMN {col_name} {col_type}"))
            conn.commit()
    except Exception:
        pass  # Column already exists

# Add logistics.quantity column if missing
try:
    with engine.connect() as conn:
        col_type = "REAL" if is_sqlite else "DOUBLE PRECISION"
        conn.execute(text(f"ALTER TABLE logistics ADD COLUMN quantity {col_type}"))
        conn.commit()
except Exception:
    pass  # Column already exists or table not yet created

# Drop foreign key constraint on logistics.order_id (PostgreSQL only; SQLite doesn't enforce FK by default)
if not is_sqlite:
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE logistics DROP CONSTRAINT IF EXISTS logistics_order_id_fkey"))
            conn.commit()
    except Exception:
        pass  # Constraint doesn't exist or already dropped

# Add quotation remarks columns to existing DBs (SQLite and PostgreSQL)
_remarks_new_columns_sqlite = [
    ("quotation_letter_defaults", "remarks", "TEXT"),
    ("quotation_letters", "remarks", "TEXT"),
]
_remarks_new_columns_pg = [
    ("quotation_letter_defaults", "remarks", "VARCHAR"),
    ("quotation_letters", "remarks", "VARCHAR"),
]
for table_name, col_name, col_type in (_remarks_new_columns_sqlite if is_sqlite else _remarks_new_columns_pg):
    try:
        with engine.connect() as conn:
            conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"))
            conn.commit()
    except Exception:
        pass  # Column already exists or table not yet created

# Add sales lead remarks column (existing DB compatibility)
try:
    with engine.connect() as conn:
        col_type = "TEXT" if is_sqlite else "VARCHAR"
        conn.execute(text(f"ALTER TABLE sales_leads ADD COLUMN remarks {col_type}"))
        conn.commit()
except Exception:
    pass  # Column already exists

# Add dispatch marker column on order items
try:
    with engine.connect() as conn:
        col_type = "INTEGER DEFAULT 0" if is_sqlite else "BOOLEAN DEFAULT FALSE"
        conn.execute(text(f"ALTER TABLE order_items ADD COLUMN dispatched {col_type}"))
        conn.commit()
except Exception:
    pass  # Column already exists

app = FastAPI(title="Retail Management API")

allowed_origins = [
    o.strip()
    for o in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://localhost:80",
    ).split(",")
    if o.strip() and o.strip() != "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, tags=["Authentication"])
app.include_router(products.router, prefix="/api", tags=["Products"])
app.include_router(customers.router, prefix="/api", tags=["Customers"])
app.include_router(orders.router, prefix="/api", tags=["Orders"])
app.include_router(analytics.router, prefix="/api", tags=["Analytics"])
app.include_router(retailer.router, prefix="/api", tags=["Retailer"])
app.include_router(whatsapp.router, prefix="/api", tags=["WhatsApp Webhook"])
app.include_router(organizations.router, tags=["Organizations"])
app.include_router(branches.router, tags=["Branches"])
app.include_router(users_manage.router, tags=["User Management"])
app.include_router(roles.router, tags=["Roles & RBAC"])
app.include_router(audit.router, tags=["Audit Logs"])
app.include_router(finance.router, tags=["Finance"])
app.include_router(sales_erp.router, tags=["Sales ERP"])
app.include_router(procurement.router, tags=["Procurement"])
app.include_router(inventory_erp.router, tags=["Inventory ERP"])
app.include_router(reports.router, tags=["Reports"])
app.include_router(saas.router, tags=["SaaS"])
app.include_router(logistics.router, tags=["Logistics"])
app.include_router(leads.router, tags=["Leads"])
app.include_router(sales_leads.router, tags=["Customer/Sales Lead"])
app.include_router(quotation_letters.router, tags=["Quotation Letters"])
app.include_router(product_price_list.router, tags=["Product Price List"])

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
