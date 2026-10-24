from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Response, Request
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.core.security import get_optional_user
from backend.app.models.auth import User
from backend.app.schemas.cart import CartOut, CartItemCreate, CartItemUpdate
from backend.app.services.cart_service import (
    get_or_create_cart, get_cart_with_items, add_item_to_cart,
    update_cart_item, remove_cart_item
)

router = APIRouter(prefix="/cart", tags=["Cart"])

def format_cart_response(cart) -> dict:
    if not cart:
        return {"id": "", "items": [], "subtotal": 0.0, "item_count": 0}
    
    subtotal = 0.0
    item_count = 0
    items_out = []

    for it in cart.items:
        p = it.product
        price = float(it.variant.selling_price if it.variant and it.variant.selling_price else p.selling_price or 0.0) if p else 0.0
        line_total = price * it.quantity
        subtotal += line_total
        item_count += it.quantity
        items_out.append(it)

    return {
        "id": cart.id,
        "user_id": cart.user_id,
        "session_id": cart.session_id,
        "items": items_out,
        "subtotal": round(subtotal, 2),
        "item_count": item_count
    }

@router.get("", response_model=CartOut)
def get_cart(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
    session_id: Optional[str] = Header(None, alias="x-cart-session-id")
):
    session_val = session_id or request.cookies.get("cart_session")
    if not user and not session_val:
        import uuid
        session_val = f"ses_{uuid.uuid4().hex[:16]}"
        response.set_cookie(key="cart_session", value=session_val, httponly=True, samesite="lax")

    cart = get_or_create_cart(db, user_id=user.id if user else None, session_id=session_val if not user else None)
    cart_with_items = get_cart_with_items(db, cart.id)
    return format_cart_response(cart_with_items)

@router.post("/items", response_model=CartOut)
def add_cart_item(
    payload: CartItemCreate,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
    session_id: Optional[str] = Header(None, alias="x-cart-session-id")
):
    session_val = session_id or request.cookies.get("cart_session")
    if not user and not session_val:
        import uuid
        session_val = f"ses_{uuid.uuid4().hex[:16]}"
        response.set_cookie(key="cart_session", value=session_val, httponly=True, samesite="lax")

    cart = get_or_create_cart(db, user_id=user.id if user else None, session_id=session_val if not user else None)
    try:
        add_item_to_cart(
            db=db,
            cart=cart,
            product_id=payload.product_id,
            variant_id=payload.variant_id,
            quantity=payload.quantity
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    cart_with_items = get_cart_with_items(db, cart.id)
    return format_cart_response(cart_with_items)

@router.patch("/items/{item_id}", response_model=CartOut)
def update_item_quantity(
    item_id: str,
    payload: CartItemUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
    session_id: Optional[str] = Header(None, alias="x-cart-session-id")
):
    session_val = session_id or request.cookies.get("cart_session")
    cart = get_or_create_cart(db, user_id=user.id if user else None, session_id=session_val if not user else None)
    
    success = update_cart_item(db, item_id=item_id, quantity=payload.quantity)
    if not success:
        raise HTTPException(status_code=404, detail="Cart item not found")

    cart_with_items = get_cart_with_items(db, cart.id)
    return format_cart_response(cart_with_items)

@router.delete("/items/{item_id}", response_model=CartOut)
def delete_cart_item(
    item_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
    session_id: Optional[str] = Header(None, alias="x-cart-session-id")
):
    session_val = session_id or request.cookies.get("cart_session")
    cart = get_or_create_cart(db, user_id=user.id if user else None, session_id=session_val if not user else None)
    
    success = remove_cart_item(db, item_id=item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Cart item not found")

    cart_with_items = get_cart_with_items(db, cart.id)
    return format_cart_response(cart_with_items)
