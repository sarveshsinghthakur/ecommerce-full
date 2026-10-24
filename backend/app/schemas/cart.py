from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from backend.app.schemas.catalog import ProductOut, ProductVariantOut

class CartItemCreate(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    quantity: int = 1


class CartItemUpdate(BaseModel):
    quantity: int


class CartItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    product_id: str
    variant_id: Optional[str] = None
    quantity: int
    product: Optional[ProductOut] = None
    variant: Optional[ProductVariantOut] = None


class CartOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    items: List[CartItemOut] = []
    subtotal: float = 0.0
    item_count: int = 0
