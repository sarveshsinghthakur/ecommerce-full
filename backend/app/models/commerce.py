from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, Numeric, DateTime,
    ForeignKey
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from backend.app.db.base import Base

class Cart(Base):
    __tablename__ = "carts"

    id = Column(Text, primary_key=True)
    user_id = Column(Text, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, unique=True)
    session_id = Column(Text, nullable=True, unique=True)
    merged_into_id = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="cart")
    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")


class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(Text, primary_key=True)
    cart_id = Column(Text, ForeignKey("carts.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Text, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    variant_id = Column(Text, ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)
    quantity = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    cart = relationship("Cart", back_populates="items")
    product = relationship("Product")
    variant = relationship("ProductVariant")


class Wishlist(Base):
    __tablename__ = "wishlists"

    id = Column(Text, primary_key=True)
    user_id = Column(Text, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="wishlist")
    items = relationship("WishlistItem", back_populates="wishlist", cascade="all, delete-orphan")


class WishlistItem(Base):
    __tablename__ = "wishlist_items"

    id = Column(Text, primary_key=True)
    wishlist_id = Column(Text, ForeignKey("wishlists.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Text, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    wishlist = relationship("Wishlist", back_populates="items")
    product = relationship("Product")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Text, primary_key=True)
    order_number = Column(Text, unique=True, nullable=False)
    user_id = Column(Text, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    email = Column(Text, nullable=False)
    full_name = Column(Text, nullable=False)
    phone = Column(Text, nullable=False)
    address_id = Column(Text, nullable=True)
    shipping_address = Column(JSONB, nullable=False)
    status = Column(Text, nullable=False, default="pending_payment")
    payment_status = Column(Text, nullable=False, default="pending")
    payment_provider = Column(Text, nullable=True)
    currency = Column(Text, nullable=False, default="INR")
    subtotal = Column(Numeric(12, 2), nullable=False)
    shipping_amount = Column(Numeric(12, 2), nullable=False, default=0)
    tax_amount = Column(Numeric(12, 2), nullable=False, default=0)
    discount_amount = Column(Numeric(12, 2), nullable=False, default=0)
    total = Column(Numeric(12, 2), nullable=False)
    coupon_code = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    idempotency_key = Column(Text, nullable=True)
    placed_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")
    status_history = relationship("OrderStatusHistory", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Text, primary_key=True)
    order_id = Column(Text, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Text, nullable=True)
    variant_id = Column(Text, nullable=True)
    product_slug = Column(Text, nullable=False)
    title = Column(Text, nullable=False)
    variant_name = Column(Text, nullable=True)
    sku = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    source_url = Column(Text, nullable=True)
    source_provider = Column(Text, nullable=True)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    source_price = Column(Numeric(12, 2), nullable=True)
    markup_percent = Column(Numeric(6, 2), nullable=True)
    tax_amount = Column(Numeric(12, 2), nullable=False, default=0)
    line_total = Column(Numeric(12, 2), nullable=False)
    sourcing_status = Column(Text, nullable=False, default="not_started")
    sourcing_note = Column(Text, nullable=True)
    ordered_from_provider_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    order = relationship("Order", back_populates="items")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Text, primary_key=True)
    order_id = Column(Text, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    provider = Column(Text, nullable=False)  # "paytm", "razorpay", "cod"
    provider_order_id = Column(Text, nullable=True)
    provider_payment_id = Column(Text, nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(Text, nullable=False, default="INR")
    status = Column(Text, nullable=False, default="pending")  # "pending", "paid", "failed", "refunded"
    method = Column(Text, nullable=True)
    meta = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    order = relationship("Order", back_populates="payments")


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id = Column(Text, primary_key=True)
    order_id = Column(Text, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    from_status = Column(Text, nullable=True)
    to_status = Column(Text, nullable=False)
    note = Column(Text, nullable=True)
    actor = Column(Text, nullable=False, default="system")
    actor_uid = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    order = relationship("Order", back_populates="status_history")


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Text, primary_key=True)
    code = Column(Text, unique=True, nullable=False)
    description = Column(Text, nullable=True)
    type = Column(Text, nullable=False, default="percent")  # "percent" or "flat"
    value = Column(Numeric(12, 2), nullable=False)
    min_order_amount = Column(Numeric(12, 2), nullable=False, default=0)
    max_uses = Column(Integer, nullable=True)
    used_count = Column(Integer, nullable=False, default=0)
    starts_at = Column(DateTime(timezone=True), nullable=True)
    ends_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class CustomerReview(Base):
    __tablename__ = "customer_reviews"

    id = Column(Text, primary_key=True)
    product_id = Column(Text, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Text, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    order_id = Column(Text, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    rating = Column(Integer, nullable=False)
    title = Column(Text, nullable=True)
    body = Column(Text, nullable=False)
    status = Column(Text, nullable=False, default="approved")  # "pending", "approved", "rejected"
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
