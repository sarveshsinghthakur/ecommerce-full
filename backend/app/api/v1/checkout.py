from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.core.security import get_current_user
from backend.app.models.auth import User
from backend.app.schemas.order import OrderCreateRequest, OrderOut
from backend.app.services.cart_service import get_or_create_cart, merge_session_cart
from backend.app.services.order_service import create_order_from_cart

router = APIRouter(prefix="/checkout", tags=["Checkout"])

@router.post("", response_model=OrderOut)
def checkout(
    payload: OrderCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    session_id: Optional[str] = Header(None, alias="x-cart-session-id")
):
    session_val = session_id or request.cookies.get("cart_session")
    if session_val:
        cart = merge_session_cart(db, session_id=session_val, user_id=user.id)
    else:
        cart = get_or_create_cart(db, user_id=user.id)

    try:
        order = create_order_from_cart(
            db=db,
            user=user,
            cart=cart,
            shipping_address=payload.shipping_address,
            payment_method=payload.payment_method,
            coupon_code=payload.coupon_code,
            notes=payload.notes,
            idempotency_key=payload.idempotency_key
        )
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
