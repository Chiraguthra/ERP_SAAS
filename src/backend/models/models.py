from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, DateTime, Boolean, Float, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..db.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, default="staff")
    name = Column(String, nullable=False)

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    description = Column(String)
    sku = Column(String, unique=True, index=True, nullable=True)  # nullable so multiple products without sku allowed
    price = Column(Numeric, nullable=True)
    stock = Column(Float, default=0.0)  # DOUBLE PRECISION
    unit = Column(String, nullable=True)  # e.g. pcs, kg, box
    reorder_level = Column(Float, nullable=True)  # alert when stock below this

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    # Legacy / display; unique so no two businesses share the same name
    name = Column(String, unique=True, index=True, nullable=True)
    # New schema fields
    company = Column(String, nullable=True)
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    pin_code = Column(Integer, nullable=True)
    country = Column(String, nullable=True)
    created_on = Column(DateTime(timezone=True), server_default=func.now(), nullable=True)
    website = Column(String, nullable=True)
    phone = Column(String, nullable=True)  # string to allow +, spaces; schema had integer
    email_id = Column(String, nullable=True)
    email = Column(String, nullable=True)  # legacy; prefer email_id
    contact_person = Column(String, nullable=True)
    is_lead = Column(String, nullable=True)
    lead_status = Column(String, nullable=True)
    lead_source = Column(String, nullable=True)
    assigned_to = Column(String, nullable=True)
    client_migration_date = Column(DateTime(timezone=True), nullable=True)
    gstin = Column(String, nullable=True)  # GSTIN
    status = Column(String, nullable=True)
    username = Column(String, nullable=True)
    lead_close_code = Column(Integer, nullable=True)  # lead_close (integer)
    created_by = Column(String, nullable=True)
    location = Column(String, nullable=True)
    lead_closed_at = Column(DateTime(timezone=True), nullable=True)  # lead_close (datetime)
    lead_id = Column(String, nullable=True)
    pan = Column(String, nullable=True)  # PAN

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    bill_id = Column(String, nullable=True)  # Optional manual bill/reference ID
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    status = Column(String, default="pending")
    total_amount = Column(Numeric, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    # Financial summary: freight, adjustments, GST percentages (applied on items subtotal)
    freight_charges = Column(Numeric, nullable=True, default=0)
    adjustments = Column(Numeric, nullable=True, default=0)  # discount/adjustment (subtracted)
    cgst_percent = Column(Numeric, nullable=True)  # e.g. 9 for 9%
    sgst_percent = Column(Numeric, nullable=True)
    igst_percent = Column(Numeric, nullable=True)
    # Order reference / dispatch fields
    delivery_note = Column(String, nullable=True)
    reference_no = Column(String, nullable=True)
    buyers_order_no = Column(String, nullable=True)
    dispatch_doc_no = Column(String, nullable=True)
    dispatched_through = Column(String, nullable=True)
    mode_terms_of_payment = Column(String, nullable=True)
    other_references = Column(String, nullable=True)
    delivery_note_date = Column(DateTime(timezone=True), nullable=True)
    destination = Column(String, nullable=True)
    terms_of_delivery = Column(String, nullable=True)
    contact_number = Column(String, nullable=True)  # order-specific contact phone
    assigned_to = Column(String, nullable=True)  # staff name / login responsible for the order

    customer = relationship("Customer")
    items = relationship("OrderItem", back_populates="order")

class Retailer(Base):
    """Single retailer/business details (one row); used as 'From' on order print."""
    __tablename__ = "retailers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)  # e.g. Silverline Techno Management Services
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    pin_code = Column(String, nullable=True)
    country = Column(String, nullable=True)
    gstin = Column(String, nullable=True)
    pan = Column(String, nullable=True)


class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Numeric, nullable=False)
    dispatched = Column(Boolean, default=False, nullable=False)
    
    order = relationship("Order", back_populates="items")
    product = relationship("Product")


class SalesLead(Base):
    """Customer / Sales Lead - standalone table, no relation to customers or orders. Duplicates allowed."""
    __tablename__ = "sales_leads"
    id = Column(Integer, primary_key=True, index=True)
    customer = Column(String, nullable=True)
    company = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    status = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    city = Column(String, nullable=True)
    assigned = Column(String, nullable=True)
    product = Column(String, nullable=True)
    remarks = Column(String, nullable=True)


class QuotationLetterDefaults(Base):
    """Defaults for simple quotation letter fields (buyer/seller details, subject, products, terms)."""
    __tablename__ = "quotation_letter_defaults"
    id = Column(Integer, primary_key=True, index=True)
    buyer_name = Column(String, nullable=True)
    buyer_address = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    product_details = Column(String, nullable=True)
    remarks = Column(String, nullable=True)
    terms_and_conditions = Column(String, nullable=True)
    bank_details = Column(String, nullable=True)
    seller_name = Column(String, nullable=True)
    seller_designation = Column(String, nullable=True)
    seller_company = Column(String, nullable=True)
    seller_phone = Column(String, nullable=True)


class QuotationLetter(Base):
    """Saved simple quotation letters used for PDF generation in the classic SILVERLINE format."""
    __tablename__ = "quotation_letters"
    id = Column(Integer, primary_key=True, index=True)
    buyer_name = Column(String, nullable=True)
    buyer_address = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    product_details = Column(String, nullable=True)
    remarks = Column(String, nullable=True)
    terms_and_conditions = Column(String, nullable=True)
    bank_details = Column(String, nullable=True)
    seller_name = Column(String, nullable=True)
    seller_designation = Column(String, nullable=True)
    seller_company = Column(String, nullable=True)
    seller_phone = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EstimateDefaults(Base):
    """Defaults for GST-style estimates (proforma), separate from quotation letter defaults."""
    __tablename__ = "estimate_defaults"
    id = Column(Integer, primary_key=True, index=True)
    buyer_name = Column(String, nullable=True)
    buyer_address = Column(String, nullable=True)
    buyer_gstin = Column(String, nullable=True)
    buyer_phone = Column(String, nullable=True)
    place_of_supply = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    product_details = Column(String, nullable=True)
    remarks = Column(String, nullable=True)
    terms_and_conditions = Column(String, nullable=True)
    bank_details = Column(String, nullable=True)
    seller_name = Column(String, nullable=True)
    seller_designation = Column(String, nullable=True)
    seller_company = Column(String, nullable=True)
    seller_phone = Column(String, nullable=True)


class ProformaInvoice(Base):
    """Saved estimate documents (GST-style PDF); fallbacks use estimate_defaults."""
    __tablename__ = "proforma_invoices"
    id = Column(Integer, primary_key=True, index=True)
    buyer_name = Column(String, nullable=True)
    buyer_address = Column(String, nullable=True)
    buyer_gstin = Column(String, nullable=True)
    buyer_phone = Column(String, nullable=True)
    place_of_supply = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    product_details = Column(String, nullable=True)
    remarks = Column(String, nullable=True)
    terms_and_conditions = Column(String, nullable=True)
    bank_details = Column(String, nullable=True)
    seller_name = Column(String, nullable=True)
    seller_designation = Column(String, nullable=True)
    seller_company = Column(String, nullable=True)
    seller_phone = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ProductPriceListItem(Base):
    """Price list for CRM rate enquiry – first and final price per product."""
    __tablename__ = "product_price_list"
    id = Column(Integer, primary_key=True, index=True)
    product_name = Column(String, nullable=False, unique=True)
    first_price = Column(Numeric, nullable=False)
    final_price = Column(Numeric, nullable=False)


class CustomerApprovedRate(Base):
    """Customer-specific approved selling rates per product, with validity window (for estimates)."""
    __tablename__ = "customer_approved_rates"
    __table_args__ = (UniqueConstraint("customer_id", "product_id", name="uq_customer_product_approved_rate"),)

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    approved_rate = Column(Numeric, nullable=False)
    gst_percent = Column(Numeric, nullable=True)  # e.g. 18 for estimate line GST%
    valid_from = Column(Date, nullable=True)  # inclusive; NULL = no lower bound
    valid_to = Column(Date, nullable=True)  # inclusive; NULL = open-ended
    remarks = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    customer = relationship("Customer")
    product = relationship("Product")
