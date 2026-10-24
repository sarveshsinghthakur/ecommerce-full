import math
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.schemas.catalog import CategoryOut, ProductOut, ProductListResponse
from backend.app.services.catalog_service import (
    get_categories, get_products, get_product_by_slug
)

router = APIRouter(prefix="/catalog", tags=["Catalog"])

@router.get("/categories", response_model=List[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return get_categories(db)

@router.get("/products", response_model=ProductListResponse)
def list_products(
    category: Optional[str] = Query(None, description="Category slug"),
    q: Optional[str] = Query(None, description="Search keyword"),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    sort: str = Query("newest", pattern="^(newest|price_asc|price_desc|rating)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(16, ge=1, le=50),
    db: Session = Depends(get_db)
):
    items, total = get_products(
        db=db,
        category_slug=category,
        query=q,
        min_price=min_price,
        max_price=max_price,
        sort_by=sort,
        page=page,
        limit=limit
    )
    total_pages = math.ceil(total / limit) if total > 0 else 1
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }

@router.get("/products/{slug}", response_model=ProductOut)
def get_product(slug: str, db: Session = Depends(get_db)):
    product = get_product_by_slug(db, slug=slug)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product
