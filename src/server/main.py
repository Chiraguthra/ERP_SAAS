from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from decimal import Decimal
import os
import uvicorn
import server.models as models

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    sku: str
    price: Decimal
    stock: int = 0

class ProductCreate(ProductBase):
    pass

class ProductSchema(ProductBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class CustomerBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerSchema(CustomerBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class OrderItemCreate(BaseModel):
    productId: int
    quantity: int

class OrderCreate(BaseModel):
    customerId: int
    items: List[OrderItemCreate]
    status: Optional[str] = "draft"

@app.get("/api/products", response_model=List[ProductSchema])
def get_products(db: Session = Depends(models.get_db)):
    return db.query(models.Product).all()

@app.get("/api/products/{id}", response_model=ProductSchema)
def get_product(id: int, db: Session = Depends(models.get_db)):
    product = db.query(models.Product).filter(models.Product.id == id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@app.post("/api/products", response_model=ProductSchema, status_code=201)
def create_product(product: ProductCreate, db: Session = Depends(models.get_db)):
    db_product = models.Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@app.get("/api/customers", response_model=List[CustomerSchema])
def get_customers(db: Session = Depends(models.get_db)):
    return db.query(models.Customer).all()

@app.post("/api/customers", response_model=CustomerSchema, status_code=201)
def create_customer(customer: CustomerCreate, db: Session = Depends(models.get_db)):
    db_customer = models.Customer(**customer.model_dump())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

@app.get("/api/analytics")
def get_analytics(db: Session = Depends(models.get_db)):
    total_orders = db.query(func.count(models.Order.id)).scalar() or 0
    total_revenue_val = db.query(func.sum(models.Order.total_amount)).scalar() or 0
    total_revenue = float(total_revenue_val)
    avg_order_value = total_revenue / total_orders if total_orders > 0 else 0
    
    return {
        "totalOrders": total_orders,
        "totalRevenue": total_revenue,
        "averageOrderValue": avg_order_value,
        "statusCounts": {},
        "topProducts": []
    }

# Serve static files from the dist directory (Vite build output)
# Note: The build script puts them in dist/public
dist_path = "dist/public"

if os.path.exists(dist_path):
    app.mount("/assets", StaticFiles(directory=f"{dist_path}/assets"), name="static")

@app.get("/{full_path:path}")
async def serve_frontend(request: Request, full_path: str = ""):
    if full_path.startswith("api"):
        raise HTTPException(status_code=404)
    
    # Check if the requested file exists in dist/public
    file_path = os.path.join(dist_path, full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    
    # Fallback to index.html for SPA routing
    index_path = os.path.join(dist_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    return JSONResponse({"detail": "Not Found"}, status_code=404)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=port)
