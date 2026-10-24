import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from backend.app.db.session import get_db
from backend.app.core.security import get_current_user
from backend.app.models.auth import User
from backend.app.models.commerce import Wishlist, WishlistItem
from backend.app.models.catalog import Product
from backend.app.schemas.catalog import ProductOut

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])

def get_or_create_wishlist(db: Session, user_id: str) -> Wishlist:
    w = db.query(Wishlist).filter(Wishlist.user_id == user_id).first()
    if not w:
        w = Wishlist(id=f"wsh_{uuid.uuid4().hex[:16]}", user_id=user_id)
        db.add(w)
        db.commit()
        db.refresh(w)
    return w

@router.get("", response_model=List[ProductOut])
def get_wishlist(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    w = get_or_create_wishlist(db, user_id=user.id)
    items = db.query(WishlistItem).filter(WishlistItem.wishlist_id == w.id).options(
        joinedload(WishlistItem.product).joinedload(Product.images),
        joinedload(WishlistItem.product).joinedload(Product.variants)
    ).all()
    return [it.product for it in items if it.product]

@router.post("/items/{product_id}")
def add_to_wishlist(
    product_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    w = get_or_create_wishlist(db, user_id=user.id)
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = db.query(WishlistItem).filter(
        WishlistItem.wishlist_id == w.id,
        WishlistItem.product_id == product_id
    ).first()

    if not existing:
        wi = WishlistItem(
            id=f"wit_{uuid.uuid4().hex[:16]}",
            wishlist_id=w.id,
            product_id=product_id
        )
        db.add(wi)
        db.commit()

    return {"success": True, "message": "Product added to wishlist"}

@router.delete("/items/{product_id}")
def remove_from_wishlist(
    product_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    w = get_or_create_wishlist(db, user_id=user.id)
    existing = db.query(WishlistItem).filter(
        WishlistItem.wishlist_id == w.id,
        WishlistItem.product_id == product_id
    ).first()
    if existing:
        db.delete(existing)
        db.commit()
    return {"success": True, "message": "Product removed from wishlist"}
