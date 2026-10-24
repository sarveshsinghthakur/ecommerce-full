from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, Numeric, DateTime,
    ForeignKey, text
)
from sqlalchemy.orm import relationship
from backend.app.db.base import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Text, primary_key=True)
    parent_id = Column(Text, nullable=True)
    name = Column(Text, nullable=False)
    slug = Column(Text, unique=True, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    position = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id = Column(Text, primary_key=True)
    slug = Column(Text, unique=True, nullable=False)
    title = Column(Text, nullable=False)
    brand = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    category_id = Column(Text, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    currency = Column(Text, nullable=False, default="INR")
    source_price = Column(Numeric(12, 2), nullable=True)
    markup_percent = Column(Numeric(6, 2), nullable=True)
    calculated_selling_price = Column(Numeric(12, 2), nullable=True)
    selling_price = Column(Numeric(12, 2), nullable=True)
    price_override = Column(Boolean, nullable=False, default=False)
    reference_price = Column(Numeric(12, 2), nullable=True)
    price_verified_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(Text, nullable=False, default="draft")
    rating = Column(Numeric(3, 2), nullable=True)
    review_count = Column(Integer, nullable=False, default=0)
    stock_quantity = Column(Integer, nullable=True)
    availability = Column(Text, nullable=False, default="unknown")
    search_keywords = Column(Text, nullable=True)
    seo_title = Column(Text, nullable=True)
    seo_description = Column(Text, nullable=True)
    import_count = Column(Integer, nullable=False, default=0)
    last_imported_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = Column(DateTime(timezone=True), nullable=True)

    category = relationship("Category", back_populates="products")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.position")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan", order_by="ProductVariant.position")
    attributes = relationship("ProductAttribute", back_populates="product", cascade="all, delete-orphan", order_by="ProductAttribute.position")


class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(Text, primary_key=True)
    product_id = Column(Text, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    url = Column(Text, nullable=False)
    alt = Column(Text, nullable=True)
    position = Column(Integer, nullable=False, default=0)
    source = Column(Text, nullable=False, default="imported")
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    product = relationship("Product", back_populates="images")


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(Text, primary_key=True)
    product_id = Column(Text, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    sku = Column(Text, nullable=True)
    name = Column(Text, nullable=False)
    options = Column(Text, nullable=False, default="{}")
    source_price = Column(Numeric(12, 2), nullable=True)
    selling_price = Column(Numeric(12, 2), nullable=True)
    stock_quantity = Column(Integer, nullable=True)
    availability = Column(Text, nullable=False, default="unknown")
    position = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    product = relationship("Product", back_populates="variants")


class ProductAttribute(Base):
    __tablename__ = "product_attributes"

    id = Column(Text, primary_key=True)
    product_id = Column(Text, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    key = Column(Text, nullable=False)
    value = Column(Text, nullable=False)
    position = Column(Integer, nullable=False, default=0)

    product = relationship("Product", back_populates="attributes")
