from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, case, Date
from datetime import datetime, timedelta
from typing import Optional

from ..db.database import get_db
from ..models import models
from .auth import get_current_user

router = APIRouter()

@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    total_orders = db.query(func.count(models.Order.id)).scalar() or 0

    delivered_filter = func.lower(func.coalesce(models.Order.status, "")) == "delivered"
    pending_filter = func.lower(func.coalesce(models.Order.status, "")) == "pending"
    dispatched_filter = func.lower(func.coalesce(models.Order.status, "")) == "dispatched"
    returned_filter = func.lower(func.coalesce(models.Order.status, "")) == "return"
    open_filter = ~delivered_filter & ~returned_filter

    delivered_count = db.query(func.count(models.Order.id)).filter(delivered_filter).scalar() or 0
    total_revenue = db.query(func.coalesce(func.sum(models.Order.total_amount), 0)).filter(delivered_filter).scalar() or 0
    avg_order = float(total_revenue) / int(delivered_count) if delivered_count > 0 else 0.0

    status_rows = (
        db.query(
            func.coalesce(func.nullif(func.trim(models.Order.status), ""), "pending").label("status"),
            func.count(models.Order.id).label("count"),
        )
        .group_by("status")
        .all()
    )
    status_counts = {str(r[0]): int(r[1] or 0) for r in status_rows}

    # Top products: from OrderItem join Product, sum quantities per product
    try:
        top_items = (
            db.query(models.Product.name, func.sum(models.OrderItem.quantity).label("total"))
            .join(models.OrderItem, models.Product.id == models.OrderItem.product_id)
            .group_by(models.Product.id, models.Product.name)
            .order_by(func.sum(models.OrderItem.quantity).desc())
            .limit(5)
            .all()
        )
    except Exception:
        top_items = []

    # Quick-win funnel metrics
    funnel = {
        "pending": int(db.query(func.count(models.Order.id)).filter(pending_filter).scalar() or 0),
        "dispatched": int(db.query(func.count(models.Order.id)).filter(dispatched_filter).scalar() or 0),
        "delivered": int(delivered_count),
        "return": int(db.query(func.count(models.Order.id)).filter(returned_filter).scalar() or 0),
    }

    # Aging buckets for open orders (pending/dispatched/etc, excluding delivered/return)
    dialect = db.bind.dialect.name if db.bind is not None else ""
    if dialect == "sqlite":
        age_days_expr = func.julianday(func.current_timestamp()) - func.julianday(models.Order.created_at)
    else:
        age_days_expr = func.extract("epoch", func.now() - models.Order.created_at) / 86400.0
    aging_row = (
        db.query(
            func.coalesce(func.sum(case((age_days_expr <= 3, 1), else_=0)), 0).label("d0_3"),
            func.coalesce(func.sum(case(((age_days_expr > 3) & (age_days_expr <= 7), 1), else_=0)), 0).label("d4_7"),
            func.coalesce(func.sum(case((age_days_expr > 7, 1), else_=0)), 0).label("d8_plus"),
        )
        .filter(open_filter)
        .one()
    )
    aging = {
        "d0_3": int(aging_row[0] or 0),
        "d4_7": int(aging_row[1] or 0),
        "d8_plus": int(aging_row[2] or 0),
    }

    # Top customers by realized revenue + repeat customer rate
    top_customers_rows = (
        db.query(
            models.Customer.id.label("id"),
            func.coalesce(func.nullif(models.Customer.company, ""), models.Customer.name, "Unknown").label("name"),
            func.count(models.Order.id).label("orders"),
            func.coalesce(func.sum(models.Order.total_amount), 0).label("revenue"),
        )
        .join(models.Order, models.Order.customer_id == models.Customer.id)
        .filter(delivered_filter)
        .group_by(models.Customer.id, models.Customer.company, models.Customer.name)
        .order_by(func.sum(models.Order.total_amount).desc())
        .limit(5)
        .all()
    )
    top_customers = [
        {
            "id": int(r[0]),
            "name": str(r[1] or "Unknown"),
            "orders": int(r[2] or 0),
            "revenue": float(r[3] or 0),
        }
        for r in top_customers_rows
    ]
    customer_order_counts_subq = (
        db.query(models.Order.customer_id.label("customer_id"), func.count(models.Order.id).label("order_count"))
        .group_by(models.Order.customer_id)
        .subquery()
    )
    customers_with_orders = db.query(func.count(customer_order_counts_subq.c.customer_id)).scalar() or 0
    repeat_customers = (
        db.query(func.count(customer_order_counts_subq.c.customer_id))
        .filter(customer_order_counts_subq.c.order_count >= 2)
        .scalar()
        or 0
    )
    repeat_customer_rate = (float(repeat_customers) / float(customers_with_orders) * 100.0) if customers_with_orders > 0 else 0.0

    # Inventory quick wins
    inventory_value = db.query(func.coalesce(func.sum(models.Product.stock * models.Product.price), 0)).scalar() or 0
    low_stock_count = (
        db.query(func.count(models.Product.id))
        .filter(models.Product.reorder_level.isnot(None))
        .filter(models.Product.stock <= models.Product.reorder_level)
        .scalar()
        or 0
    )
    dead_stock_row = (
        db.query(
            func.count(models.Product.id),
            func.coalesce(func.sum(models.Product.stock * models.Product.price), 0),
        )
        .outerjoin(models.OrderItem, models.OrderItem.product_id == models.Product.id)
        .filter(models.OrderItem.id.is_(None))
        .filter(models.Product.stock > 0)
        .one()
    )
    dead_stock_count = int(dead_stock_row[0] or 0)
    dead_stock_value = float(dead_stock_row[1] or 0)

    # Delivery performance proxy
    delivered_rate = (float(delivered_count) / float(total_orders) * 100.0) if total_orders > 0 else 0.0
    if dialect == "sqlite":
        delivery_hours_expr = (func.julianday(models.Order.updated_at) - func.julianday(models.Order.created_at)) * 24.0
    else:
        delivery_hours_expr = func.extract("epoch", models.Order.updated_at - models.Order.created_at) / 3600.0
    avg_dispatch_to_delivery_hours = (
        db.query(func.coalesce(func.avg(delivery_hours_expr), 0))
        .filter(delivered_filter)
        .scalar()
        or 0
    )

    return {
        "totalOrders": int(total_orders),
        "totalRevenue": float(total_revenue),
        "averageOrderValue": float(avg_order),
        "statusCounts": {str(k): int(v) for k, v in status_counts.items()},
        "topProducts": [{"name": str(i[0] or ""), "quantity": int(i[1] or 0)} for i in top_items],
        "orderFunnel": funnel,
        "orderAging": aging,
        "topCustomers": top_customers,
        "repeatCustomerRate": float(repeat_customer_rate),
        "inventoryHealth": {
            "inventoryValue": float(inventory_value),
            "lowStockCount": int(low_stock_count),
            "deadStockCount": int(dead_stock_count),
            "deadStockValue": float(dead_stock_value),
        },
        "deliveryPerformance": {
            "deliveredRate": float(delivered_rate),
            "avgDispatchToDeliveryHours": float(avg_dispatch_to_delivery_hours),
        },
    }


@router.get("/api/analytics/revenue-over-time")
def get_revenue_over_time(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    group_by: str = "month",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Revenue from delivered orders, grouped by day/month/year for charting."""
    delivered_filter = func.lower(func.coalesce(models.Order.status, "")) == "delivered"
    dialect = db.bind.dialect.name if db.bind is not None else "sqlite"

    now = datetime.utcnow()
    if not from_date:
        from_date = (now.replace(day=1) - timedelta(days=1)).replace(day=1).strftime("%Y-%m-%d")
    if not to_date:
        to_date = now.strftime("%Y-%m-%d")

    # Compare by date only to avoid timezone/end-of-day issues (include full from_date and to_date)
    if dialect == "sqlite":
        date_col = func.date(models.Order.created_at)
    else:
        date_col = func.cast(models.Order.created_at, Date)

    if group_by == "day":
        if dialect == "sqlite":
            period_expr = func.strftime("%Y-%m-%d", models.Order.created_at)
        else:
            period_expr = func.to_char(func.date_trunc("day", models.Order.created_at), "YYYY-MM-DD")
    elif group_by == "year":
        if dialect == "sqlite":
            period_expr = func.strftime("%Y", models.Order.created_at)
        else:
            period_expr = func.to_char(func.date_trunc("year", models.Order.created_at), "YYYY")
    else:
        group_by = "month"
        if dialect == "sqlite":
            period_expr = func.strftime("%Y-%m", models.Order.created_at)
        else:
            period_expr = func.to_char(func.date_trunc("month", models.Order.created_at), "YYYY-MM")

    rows = (
        db.query(
            period_expr.label("period"),
            func.coalesce(func.sum(models.Order.total_amount), 0).label("revenue"),
        )
        .filter(delivered_filter)
        .filter(date_col >= from_date)
        .filter(date_col <= to_date)
        .group_by(period_expr)
        .order_by(period_expr)
        .all()
    )
    return {
        "from_date": from_date,
        "to_date": to_date,
        "group_by": group_by,
        "data": [{"period": str(r[0] or ""), "revenue": float(r[1] or 0)} for r in rows],
    }


@router.post("/seed")
def seed_data(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if (current_user.role or "").lower() != "admin":
        raise HTTPException(403, "Only admin can seed data")
    # 1. Create Products
    products = [
        {"name": "Premium Widget X", "sku": "WID-X-001", "description": "Top tier widget for professionals", "price": 99.99, "stock": 50},
        {"name": "Basic Gadget Y", "sku": "GAD-Y-002", "description": "Entry level gadget", "price": 24.50, "stock": 100},
        {"name": "Super Tool Z", "sku": "TOOL-Z-003", "description": "Heavy duty tool", "price": 149.99, "stock": 25}
    ]
    for p in products:
        if not db.query(models.Product).filter(models.Product.sku == p["sku"]).first():
            db.add(models.Product(**p))
    
    # 2. Create Customers
    customers = [
        {"name": "John Doe", "email": "john@example.com", "phone": "555-0101", "address": "123 Main St"},
        {"name": "Jane Smith", "email": "jane@example.com", "phone": "555-0102", "address": "456 Oak Ave"}
    ]
    for c in customers:
        if not db.query(models.Customer).filter(models.Customer.email == c["email"]).first():
            db.add(models.Customer(**c))
    
    db.commit()
    return {"status": "seeded"}
