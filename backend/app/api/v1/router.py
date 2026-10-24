from fastapi import APIRouter
from backend.app.api.v1.health import router as health_router
from backend.app.api.v1.catalog import router as catalog_router
from backend.app.api.v1.cart import router as cart_router
from backend.app.api.v1.checkout import router as checkout_router
from backend.app.api.v1.orders import router as orders_router
from backend.app.api.v1.payments import router as payments_router
from backend.app.api.v1.auth import router as auth_router
from backend.app.api.v1.wishlist import router as wishlist_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(health_router)
api_v1_router.include_router(catalog_router)
api_v1_router.include_router(cart_router)
api_v1_router.include_router(checkout_router)
api_v1_router.include_router(orders_router)
api_v1_router.include_router(payments_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(wishlist_router)
