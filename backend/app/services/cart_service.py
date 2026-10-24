import uuid
from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from backend.app.models.commerce import Cart, CartItem
from backend.app.models.catalog import Product, ProductVariant

def get_or_create_cart(
    db: Session,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None
) -> Cart:
    cart = None
    if user_id:
        cart = db.query(Cart).filter(Cart.user_id == user_id).first()
    elif session_id:
        cart = db.query(Cart).filter(Cart.session_id == session_id).first()

    if not cart:
        cart = Cart(
            id=f"crt_{uuid.uuid4().hex[:16]}",
            user_id=user_id,
            session_id=session_id if not user_id else None
        )
        db.add(cart)
        db.commit()
        db.refresh(cart)

    return cart

def get_cart_with_items(db: Session, cart_id: str) -> Optional[Cart]:
    return db.query(Cart).filter(Cart.id == cart_id).options(
        joinedload(Cart.items).joinedload(CartItem.product).joinedload(Product.images),
        joinedload(Cart.items).joinedload(CartItem.variant)
    ).first()

def add_item_to_cart(
    db: Session,
    cart: Cart,
    product_id: str,
    variant_id: Optional[str] = None,
    quantity: int = 1
) -> CartItem:
    product = db.query(Product).filter(Product.id == product_id, Product.status == "published").first()
    if not product:
        raise ValueError("Product not found or not available for purchase")

    existing_item = db.query(CartItem).filter(
        CartItem.cart_id == cart.id,
        CartItem.product_id == product_id,
        CartItem.variant_id == variant_id
    ).first()

    if existing_item:
        existing_item.quantity += quantity
        db.commit()
        db.refresh(existing_item)
        return existing_item
    else:
        new_item = CartItem(
            id=f"cit_{uuid.uuid4().hex[:16]}",
            cart_id=cart.id,
            product_id=product_id,
            variant_id=variant_id,
            quantity=max(1, quantity)
        )
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        return new_item

def update_cart_item(db: Session, item_id: str, quantity: int) -> bool:
    item = db.query(CartItem).filter(CartItem.id == item_id).first()
    if not item:
        return False
    if quantity <= 0:
        db.delete(item)
    else:
        item.quantity = quantity
    db.commit()
    return True

def remove_cart_item(db: Session, item_id: str) -> bool:
    item = db.query(CartItem).filter(CartItem.id == item_id).first()
    if not item:
        return False
    db.delete(item)
    db.commit()
    return True

def merge_session_cart(db: Session, session_id: str, user_id: str) -> Cart:
    user_cart = get_or_create_cart(db, user_id=user_id)
    session_cart = db.query(Cart).filter(Cart.session_id == session_id).first()
    if not session_cart or session_cart.id == user_cart.id:
        return user_cart

    # Transfer items
    session_items = db.query(CartItem).filter(CartItem.cart_id == session_cart.id).all()
    for item in session_items:
        existing = db.query(CartItem).filter(
            CartItem.cart_id == user_cart.id,
            CartItem.product_id == item.product_id,
            CartItem.variant_id == item.variant_id
        ).first()
        if existing:
            existing.quantity += item.quantity
        else:
            item.cart_id = user_cart.id
    
    session_cart.merged_into_id = user_cart.id
    db.commit()
    db.refresh(user_cart)
    return user_cart
