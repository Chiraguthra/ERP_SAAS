# ERP SaaS models: Tenant, RBAC, Audit, Finance, Sales, Procurement, Inventory, SaaS
from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, DateTime, Boolean, Float, Text, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..db.database import Base

# --- Core Platform & Tenant Management ---

class Organization(Base):
    __tablename__ = "organizations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    branches = relationship("Branch", back_populates="organization")


class Branch(Base):
    __tablename__ = "branches"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    organization = relationship("Organization", back_populates="branches")


class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)


class Permission(Base):
    __tablename__ = "permissions"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    module = Column(String(50), nullable=True)


# Many-to-many: role_permissions
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id"), primary_key=True),
)


class UserOrganization(Base):
    __tablename__ = "user_organizations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    tenant_id = Column(Integer, nullable=True)  # organization_id
    action = Column(String(50), nullable=False)  # create, update, delete, login
    resource_type = Column(String(100), nullable=True)
    resource_id = Column(String(100), nullable=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# --- Chart of Accounts & General Ledger ---

class ChartOfAccount(Base):
    __tablename__ = "chart_of_accounts"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=True, default=1)
    code = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    account_type = Column(String(50), nullable=False)  # asset, liability, equity, revenue, expense
    parent_id = Column(Integer, ForeignKey("chart_of_accounts.id"), nullable=True)
    is_active = Column(Boolean, default=True)


class JournalEntry(Base):
    __tablename__ = "journal_entries"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=True, default=1)
    number = Column(String(50), nullable=True)
    date = Column(DateTime(timezone=True), nullable=False)
    reference = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String(20), default="draft")  # draft, posted
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    lines = relationship("JournalLine", back_populates="journal")


class JournalLine(Base):
    __tablename__ = "journal_lines"
    id = Column(Integer, primary_key=True, index=True)
    journal_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("chart_of_accounts.id"), nullable=False)
    debit = Column(Numeric(18, 2), default=0)
    credit = Column(Numeric(18, 2), default=0)
    description = Column(Text, nullable=True)
    journal = relationship("JournalEntry", back_populates="lines")


# --- Vendors & AP ---

class Vendor(Base):
    __tablename__ = "vendors"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=True, default=1)
    name = Column(String(255), nullable=False)
    company = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    gstin = Column(String(50), nullable=True)
    pan = Column(String(20), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# --- Sales: Quotation, Invoice, Delivery ---

class Quotation(Base):
    __tablename__ = "quotations"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=True, default=1)
    number = Column(String(50), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), default="draft")  # draft, sent, accepted, rejected
    total_amount = Column(Numeric(18, 2), default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    items = relationship("QuotationItem", back_populates="quotation")


class QuotationItem(Base):
    __tablename__ = "quotation_items"
    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    price = Column(Numeric(18, 2), nullable=False)
    quotation = relationship("Quotation", back_populates="items")


class SalesInvoice(Base):
    __tablename__ = "sales_invoices"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=True, default=1)
    number = Column(String(50), nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    subtotal = Column(Numeric(18, 2), default=0)
    tax_amount = Column(Numeric(18, 2), default=0)
    total_amount = Column(Numeric(18, 2), default=0)
    status = Column(String(20), default="draft")  # draft, posted, paid, partial
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DeliveryNote(Base):
    __tablename__ = "delivery_notes"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=True, default=1)
    number = Column(String(50), nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), default="draft")
    items = relationship("DeliveryNoteItem", back_populates="delivery_note")


class DeliveryNoteItem(Base):
    __tablename__ = "delivery_note_items"
    id = Column(Integer, primary_key=True, index=True)
    delivery_note_id = Column(Integer, ForeignKey("delivery_notes.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    delivery_note = relationship("DeliveryNote", back_populates="items")


# --- Payments (AR/AP) ---

class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=True, default=1)
    type = Column(String(20), nullable=False)  # receipt (AR), payment (AP)
    amount = Column(Numeric(18, 2), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    reference = Column(String(255), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    invoice_id = Column(Integer, ForeignKey("sales_invoices.id"), nullable=True)  # for AR link
    journal_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# --- Bank ---

class BankAccount(Base):
    __tablename__ = "bank_accounts"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=True, default=1)
    name = Column(String(255), nullable=False)
    account_number = Column(String(100), nullable=True)
    bank_name = Column(String(255), nullable=True)
    opening_balance = Column(Numeric(18, 2), default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    statement_lines = relationship("BankStatementLine", back_populates="bank_account")


class BankStatementLine(Base):
    __tablename__ = "bank_statement_lines"
    id = Column(Integer, primary_key=True, index=True)
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    description = Column(Text, nullable=True)
    amount = Column(Numeric(18, 2), nullable=False)  # + deposit, - withdrawal
    reconciled = Column(Boolean, default=False)
    matched_to = Column(String(100), nullable=True)  # journal_id or payment_id
    bank_account = relationship("BankAccount", back_populates="statement_lines")


# --- Procurement ---

class PurchaseRequest(Base):
    __tablename__ = "purchase_requests"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=True, default=1)
    number = Column(String(50), nullable=True)
    date = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), default="draft")
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    items = relationship("PurchaseRequestItem", back_populates="purchase_request")


class PurchaseRequestItem(Base):
    __tablename__ = "purchase_request_items"
    id = Column(Integer, primary_key=True, index=True)
    purchase_request_id = Column(Integer, ForeignKey("purchase_requests.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    description = Column(Text, nullable=True)
    quantity = Column(Float, nullable=False)
    estimated_price = Column(Numeric(18, 2), nullable=True)
    purchase_request = relationship("PurchaseRequest", back_populates="items")


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=True, default=1)
    number = Column(String(50), nullable=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), default="draft")
    total_amount = Column(Numeric(18, 2), default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    items = relationship("PurchaseOrderItem", back_populates="purchase_order")


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"
    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    description = Column(Text, nullable=True)
    quantity = Column(Float, nullable=False)
    price = Column(Numeric(18, 2), nullable=False)
    purchase_order = relationship("PurchaseOrder", back_populates="items")


class GoodsReceipt(Base):
    __tablename__ = "goods_receipts"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=True, default=1)
    number = Column(String(50), nullable=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), default="draft")
    items = relationship("GoodsReceiptItem", back_populates="goods_receipt")


class GoodsReceiptItem(Base):
    __tablename__ = "goods_receipt_items"
    id = Column(Integer, primary_key=True, index=True)
    goods_receipt_id = Column(Integer, ForeignKey("goods_receipts.id"), nullable=False)
    purchase_order_item_id = Column(Integer, ForeignKey("purchase_order_items.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    goods_receipt = relationship("GoodsReceipt", back_populates="items")


class VendorInvoice(Base):
    __tablename__ = "vendor_invoices"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=True, default=1)
    number = Column(String(50), nullable=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=True)
    date = Column(DateTime(timezone=True), nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    total_amount = Column(Numeric(18, 2), default=0)
    status = Column(String(20), default="draft")
    match_status = Column(String(20), nullable=True)  # matched, partial, unmatched (3-way)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    lines = relationship("VendorInvoiceLine", back_populates="vendor_invoice")


class VendorInvoiceLine(Base):
    __tablename__ = "vendor_invoice_lines"
    id = Column(Integer, primary_key=True, index=True)
    vendor_invoice_id = Column(Integer, ForeignKey("vendor_invoices.id"), nullable=False)
    description = Column(Text, nullable=True)
    quantity = Column(Float, nullable=False)
    price = Column(Numeric(18, 2), nullable=False)
    amount = Column(Numeric(18, 2), nullable=False)
    vendor_invoice = relationship("VendorInvoice", back_populates="lines")


# --- Inventory ---

class Warehouse(Base):
    __tablename__ = "warehouses"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=True, default=1)
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class StockMovement(Base):
    __tablename__ = "stock_movements"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=True, default=1)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    type = Column(String(20), nullable=False)  # in, out, adjustment, transfer
    quantity = Column(Float, nullable=False)  # + for in, - for out
    reference_type = Column(String(50), nullable=True)  # order, gr, adjustment
    reference_id = Column(Integer, nullable=True)
    date = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    unit_cost = Column(Numeric(18, 2), nullable=True)


class ProductWarehouse(Base):
    __tablename__ = "product_warehouse"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False)
    quantity = Column(Float, default=0)


# --- SaaS ---

class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    price_monthly = Column(Numeric(18, 2), default=0)
    price_yearly = Column(Numeric(18, 2), default=0)
    max_users = Column(Integer, nullable=True)
    max_storage_mb = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)


class TenantSubscription(Base):
    __tablename__ = "tenant_subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"), nullable=False)
    status = Column(String(20), default="active")  # active, cancelled, past_due
    started_at = Column(DateTime(timezone=True), nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=True)


class TenantFeatureToggle(Base):
    __tablename__ = "tenant_feature_toggles"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    feature_code = Column(String(100), nullable=False)
    enabled = Column(Boolean, default=True)


class UsageLog(Base):
    __tablename__ = "usage_logs"
    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    metric = Column(String(50), nullable=False)  # users, orders_count, storage_mb
    value = Column(Numeric(18, 2), nullable=False)
    period_start = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# --- Logistics ---

class Logistics(Base):
    __tablename__ = "logistics"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=True, default=1)
    order_id = Column(Integer, nullable=True)  # No FK - just a reference number
    product_name = Column(String(255), nullable=False)
    product_unit = Column(String(50), nullable=True)
    quantity = Column(Float, nullable=True)
    distance = Column(Float, nullable=True)  # in km or miles
    date = Column(DateTime(timezone=True), nullable=False)
    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# --- Website Leads ---

class Lead(Base):
    """Leads captured from the marketing website."""
    __tablename__ = "leads"
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=True)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    company = Column(String(255), nullable=True)
    message = Column(Text, nullable=True)
    source = Column(String(50), nullable=True)  # e.g., "website", "contact_form"
    status = Column(String(50), default="new")  # new, contacted, qualified, converted
    created_at = Column(DateTime(timezone=True), server_default=func.now())
