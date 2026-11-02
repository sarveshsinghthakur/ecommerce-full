"""Hermetic tests: never load developer secrets or connect to the configured DB."""
import os

import pytest
from pydantic_settings.sources import DotEnvSettingsSource
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# This must run before importing application modules during collection.
DotEnvSettingsSource._read_env_files = lambda self: {}
os.environ.update(
    DATABASE_URL="sqlite:///unused-test-only.db",
    ENVIRONMENT="test",
    AUTH_TEST_MODE="false",
    PAYTM_TEST_MODE="false",
    SESSION_SECRET="isolated-tests-only-not-a-production-secret",
)

from backend.app.db.base import Base
from backend.app.models import auth, catalog, commerce  # noqa: F401


@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"


@pytest.fixture
def db():
    engine = create_engine("sqlite://", poolclass=StaticPool,
                           connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    with sessionmaker(bind=engine, autoflush=False)() as session:
        yield session
    engine.dispose()


@pytest.fixture
def shop(db):
    from backend.app.models.auth import User
    from backend.app.models.catalog import Product
    from backend.app.models.commerce import Cart, CartItem

    owner = User(id="owner", firebase_uid="owner", email="owner@example.test")
    other = User(id="other", firebase_uid="other", email="other@example.test")
    product = Product(id="product", slug="product", title="Product", status="published",
                      selling_price=100, stock_quantity=3, availability="in_stock")
    cart = Cart(id="owner-cart", user_id="owner")
    other_cart = Cart(id="other-cart", user_id="other")
    item = CartItem(id="owner-item", cart_id=cart.id, product_id=product.id, quantity=2)
    db.add_all([owner, other, product, cart, other_cart, item])
    db.commit()
    return owner, other, product, cart, other_cart, item


@pytest.fixture
def client(db, shop):
    from fastapi.testclient import TestClient
    from backend.app.main import app
    from backend.app.db.session import get_db
    from backend.app.core.security import get_optional_user

    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_optional_user] = lambda: shop[1]
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()