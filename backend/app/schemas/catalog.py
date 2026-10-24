from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    parent_id: Optional[str] = None
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    position: int = 0
    is_active: bool = True


class ProductImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    url: str
    alt: Optional[str] = None
    position: int = 0
    width: Optional[int] = None
    height: Optional[int] = None


class ProductVariantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    sku: Optional[str] = None
    name: str
    options: Optional[Any] = None
    selling_price: Optional[float] = None
    stock_quantity: Optional[int] = None
    availability: str = "unknown"
    position: int = 0


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    slug: str
    title: str
    brand: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    currency: str = "INR"
    selling_price: Optional[float] = None
    reference_price: Optional[float] = None
    status: str
    rating: Optional[float] = None
    review_count: int = 0
    stock_quantity: Optional[int] = None
    availability: str
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    created_at: datetime
    images: List[ProductImageOut] = []
    variants: List[ProductVariantOut] = []
    category: Optional[CategoryOut] = None


class ProductListResponse(BaseModel):
    items: List[ProductOut]
    total: int
    page: int
    limit: int
    total_pages: int
