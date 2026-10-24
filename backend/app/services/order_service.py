import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session, joinedload
from backend.app.core.config import settings
from backend.app.models.commerce import Order, OrderItem, OrderStatusHistory, Cart, CartItem, Payment
from backend.app.models.catalog import Product, ProductVariant
from backend.app.models.auth import User
from backend.app.schemas.order import ShippingAddressInput

def calculate_order_totals(
    items: List[Dict[str, Any]],
    coupon_code: Optional[str] = None
) -> Dict[str, float]:
    subtotal = sum(item["unit_price"] * item["quantity"] for item in items)
    
    # Shipping rule
    if subtotal >= settings.FREE_SHIPPING_THRESHOLD or subtotal == 0:
        shipping = 0.0
    else:
        shipping = settings.DEFAULT_SHIPPING_FEE

    discount = 0.0
    if coupon_code and coupon_code.upper() in ["SAVE10", "WELCOME10"]:
        discount = round(subtotal * 0.10, 2)

    tax = round((subtotal - discount) * settings.DEFAULT_TAX_RATE, 2)
    total = max(0.0, round(subtotal - discount + shipping + tax, 2))

    return {
        "subtotal": round(subtotal, 2),
        "shipping_amount": round(shipping, 2),
        "discount_amount": round(discount, 2),
        "tax_amount": round(tax, 2),
        "total": round(total, 2)
    }

def create_order_from_cart(
    db: Session,
    user: User,
    cart: Cart,
    shipping_address: ShippingAddressInput,
    payment_method: str = "paytm",
    coupon_code: Optional[str] = None,
    notes: Optional[str] = None,
    idempotency_key: Optional[str] = None
) -> Order:
    # Check idempotency
    if idempotency_key:
        existing = db.query(Order).filter(
            Order.user_id == user.id,
            Order.idempotency_key == idempotency_key
        ).first()
        if existing:
            return existing

    cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.id).options(
        joinedload(CartItem.product).joinedload(Product.images),
        joinedload(CartItem.variant)
    ).all()

    if not cart_items:
        raise ValueError("Cannot checkout with an empty cart")

    line_items_data = []
    for ci in cart_items:
        p = ci.product
        if not p or p.status != "published":
            raise ValueError(f"Product '{p.title if p else ci.product_id}' is no longer available.")
        
        price = float(ci.variant.selling_price if ci.variant and ci.variant.selling_price else p.selling_price or 0.0)
        img_url = p.images[0].url if p.images else None

        line_items_data.append({
            "product_id": p.id,
            "variant_id": ci.variant_id,
            "product_slug": p.slug,
            "title": p.title,
            "variant_name": ci.variant.name if ci.variant else None,
            "sku": ci.variant.sku if ci.variant else None,
            "image_url": img_url,
            "quantity": ci.quantity,
            "unit_price": price
        })

    totals = calculate_order_totals(line_items_data, coupon_code=coupon_code)

    order_id = f"ord_{uuid.uuid4().hex[:16]}"
    order_number = f"AUR-{datetime.utcnow().strftime('%y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    order = Order(
        id=order_id,
        order_number=order_number,
        user_id=user.id,
        email=user.email,
        full_name=shipping_address.full_name,
        phone=shipping_address.phone,
        shipping_address=shipping_address.model_dump(),
        status="pending_payment" if payment_method == "paytm" else "confirmed",
        payment_status="pending" if payment_method == "paytm" else "cod_pending",
        payment_provider=payment_method,
        currency=settings.CURRENCY,
        subtotal=totals["subtotal"],
        shipping_amount=totals["shipping_amount"],
        discount_amount=totals["discount_amount"],
        tax_amount=totals["tax_amount"],
        total=totals["total"],
        coupon_code=coupon_code,
        notes=notes,
        idempotency_key=idempotency_key
    )
    db.add(order)

    for li in line_items_data:
        order_item = OrderItem(
            id=f"oit_{uuid.uuid4().hex[:16]}",
            order_id=order_id,
            product_id=li["product_id"],
            variant_id=li["variant_id"],
            product_slug=li["product_slug"],
            title=li["title"],
            variant_name=li["variant_name"],
            sku=li["sku"],
            image_url=li["image_url"],
            quantity=li["quantity"],
            unit_price=li["unit_price"],
            line_total=round(li["unit_price"] * li["quantity"], 2)
        )
        db.add(order_item)

    # Initial history entry
    history = OrderStatusHistory(
        id=f"osh_{uuid.uuid4().hex[:16]}",
        order_id=order_id,
        from_status=None,
        to_status=order.status,
        note="Order placed by customer",
        actor="customer",
        actor_uid=user.id
    )
    db.add(history)

    # Clear cart items
    for ci in cart_items:
        db.delete(ci)

    db.commit()
    db.refresh(order)
    return order

def get_user_orders(db: Session, user_id: str) -> List[Order]:
    return db.query(Order).filter(Order.user_id == user_id).order_by(Order.placed_at.desc()).options(
        joinedload(Order.items),
        joinedload(Order.payments)
    ).all()

def get_order_by_id(db: Session, order_id: str, user_id: Optional[str] = None) -> Optional[Order]:
    q = db.query(Order).filter(Order.id == order_id)
    if user_id:
        q = q.filter(Order.user_id == user_id)
    return q.options(
        joinedload(Order.items),
        joinedload(Order.payments),
        joinedload(Order.status_history)
    ).first()
