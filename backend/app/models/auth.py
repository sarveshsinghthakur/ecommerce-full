from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from backend.app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Text, primary_key=True)
    firebase_uid = Column(Text, unique=True, nullable=False)
    email = Column(Text, unique=True, nullable=False)
    email_verified = Column(Boolean, nullable=False, default=False)
    display_name = Column(Text, nullable=True)
    photo_url = Column(Text, nullable=True)
    phone = Column(Text, nullable=True)
    role = Column(Text, nullable=False, default="customer")  # "customer" or "admin"
    disabled = Column(Boolean, nullable=False, default=False)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    addresses = relationship("UserAddress", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user")
    cart = relationship("Cart", back_populates="user", uselist=False)
    wishlist = relationship("Wishlist", back_populates="user", uselist=False)


class UserAddress(Base):
    __tablename__ = "user_addresses"

    id = Column(Text, primary_key=True)
    user_id = Column(Text, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    label = Column(Text, nullable=False, default="Home")
    full_name = Column(Text, nullable=False)
    phone = Column(Text, nullable=False)
    line1 = Column(Text, nullable=False)
    line2 = Column(Text, nullable=True)
    city = Column(Text, nullable=False)
    state = Column(Text, nullable=False)
    postal_code = Column(Text, nullable=False)
    country = Column(Text, nullable=False, default="IN")
    is_default_shipping = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="addresses")


class AdminRole(Base):
    __tablename__ = "admin_roles"

    id = Column(Text, primary_key=True)
    user_id = Column(Text, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    granted_by_uid = Column(Text, nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
