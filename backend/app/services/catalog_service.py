from typing import Optional, List, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc, asc
from backend.app.models.catalog import Category, Product, ProductImage, ProductVariant
from backend.app.schemas.catalog import ProductListResponse, ProductOut, CategoryOut

# Curated fallback product images by category to guarantee reliable, high-end photography
CATEGORY_FALLBACK_IMAGES = {
    "electronics": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
    "audio": "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80",
    "accessories": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
    "home-kitchen": "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80",
    "gaming": "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=800&q=80",
    "default": "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80"
}

def resolve_product_image_url(url: Optional[str], category_slug: Optional[str] = None) -> str:
    """
    Validates and normalizes product image URL. If missing or invalid,
    provides a reliable, high-resolution photography asset.
    """
    if url and url.startswith("http") and not ("broken" in url.lower() or "undefined" in url):
        return url
    cat_key = (category_slug or "default").lower()
    return CATEGORY_FALLBACK_IMAGES.get(cat_key, CATEGORY_FALLBACK_IMAGES["default"])

def get_categories(db: Session) -> List[Category]:
    return db.query(Category).filter(Category.is_active == True).order_by(Category.position.asc()).all()

def get_category_by_slug(db: Session, slug: str) -> Optional[Category]:
    return db.query(Category).filter(Category.slug == slug, Category.is_active == True).first()

def get_products(
    db: Session,
    category_slug: Optional[str] = None,
    query: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by: str = "newest",
    page: int = 1,
    limit: int = 16
) -> Tuple[List[Product], int]:
    q = db.query(Product).filter(Product.status == "published")

    if category_slug:
        cat = get_category_by_slug(db, category_slug)
        if cat:
            q = q.filter(Product.category_id == cat.id)
        else:
            return [], 0

    if query:
        search_term = f"%{query.strip()}%"
        q = q.filter(
            or_(
                Product.title.ilike(search_term),
                Product.brand.ilike(search_term),
                Product.description.ilike(search_term),
                Product.search_keywords.ilike(search_term)
            )
        )

    if min_price is not None:
        q = q.filter(Product.selling_price >= min_price)
    if max_price is not None:
        q = q.filter(Product.selling_price <= max_price)

    # Sorting
    if sort_by == "price_asc":
        q = q.order_by(Product.selling_price.asc().nullslast())
    elif sort_by == "price_desc":
        q = q.order_by(Product.selling_price.desc().nullslast())
    elif sort_by == "rating":
        q = q.order_by(Product.rating.desc().nullslast())
    else:
        q = q.order_by(Product.created_at.desc())

    total = q.count()
    offset = (page - 1) * limit
    items = q.options(
        joinedload(Product.images),
        joinedload(Product.variants),
        joinedload(Product.category)
    ).offset(offset).limit(limit).all()

    # Ensure fallback image if images list is empty
    for p in items:
        if not p.images:
            fallback = ProductImage(
                id=f"fallback_{p.id}",
                product_id=p.id,
                url=resolve_product_image_url(None, p.category.slug if p.category else None),
                alt=p.title,
                position=0
            )
            p.images = [fallback]

    return items, total

def get_product_by_slug(db: Session, slug: str) -> Optional[Product]:
    p = db.query(Product).filter(
        Product.slug == slug,
        Product.status == "published"
    ).options(
        joinedload(Product.images),
        joinedload(Product.variants),
        joinedload(Product.category)
    ).first()

    if p and not p.images:
        fallback = ProductImage(
            id=f"fallback_{p.id}",
            product_id=p.id,
            url=resolve_product_image_url(None, p.category.slug if p.category else None),
            alt=p.title,
            position=0
        )
        p.images = [fallback]

    return p
