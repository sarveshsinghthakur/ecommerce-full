from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.core.security import get_current_user
from backend.app.models.auth import User
from backend.app.schemas.order import OrderOut, OrderListResponse
from backend.app.services.order_service import get_user_orders, get_order_by_id

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.get("", response_model=OrderListResponse)
def list_orders(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    items = get_user_orders(db, user_id=user.id)
    return {
        "items": items,
        "total": len(items)
    }

@router.get("/{order_id}", response_model=OrderOut)
def get_order_detail(
    order_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # Allow admins to view any order, otherwise restrict to owner
    target_user_id = None if user.role == "admin" else user.id
    order = get_order_by_id(db, order_id=order_id, user_id=target_user_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order
