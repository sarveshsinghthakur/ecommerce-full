from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class ShippingAddressInput(BaseModel):
    full_name: str
    phone: str
    line1: str
    line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str = "IN"


class OrderCreateRequest(BaseModel):
    shipping_address: ShippingAddressInput
    payment_method: str = "paytm"  # "paytm" or "cod"
    coupon_code: Optional[str] = None
    notes: Optional[str] = None
    idempotency_key: Optional[str] = None


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    product_slug: str
    title: str
    variant_name: Optional[str] = None
    image_url: Optional[str] = None
    quantity: int
    unit_price: float
    line_total: float


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    provider: str
    amount: float
    currency: str
    status: str
    provider_order_id: Optional[str] = None
    provider_payment_id: Optional[str] = None
    created_at: datetime


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    order_number: str
    status: str
    payment_status: str
    payment_provider: Optional[str] = None
    currency: str
    subtotal: float
    shipping_amount: float
    tax_amount: float
    discount_amount: float
    total: float
    shipping_address: Dict[str, Any]
    placed_at: datetime
    items: List[OrderItemOut] = []
    payments: List[PaymentOut] = []


class OrderListResponse(BaseModel):
    items: List[OrderOut]
    total: int
