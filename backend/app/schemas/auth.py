from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class SessionRequest(BaseModel):
    id_token: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    display_name: Optional[str] = None
    photo_url: Optional[str] = None
    phone: Optional[str] = None
    role: str
    created_at: datetime


class AddressCreate(BaseModel):
    label: str = "Home"
    full_name: str
    phone: str
    line1: str
    line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str = "IN"
    is_default_shipping: bool = False


class AddressOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    label: str
    full_name: str
    phone: str
    line1: str
    line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str
    is_default_shipping: bool
