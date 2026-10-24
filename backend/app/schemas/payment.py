from typing import Optional, Dict, Any
from pydantic import BaseModel

class PaymentInitiateRequest(BaseModel):
    order_id: str


class PaymentInitiateResponse(BaseModel):
    success: bool
    order_id: str
    amount: float
    currency: str = "INR"
    txn_token: Optional[str] = None
    mid: Optional[str] = None
    checkout_url: Optional[str] = None
    callback_url: Optional[str] = None
    error: Optional[str] = None


class PaymentStatusResponse(BaseModel):
    success: bool
    order_id: str
    status: str
    txn_id: Optional[str] = None
    amount: Optional[str] = None
    resp_msg: Optional[str] = None
