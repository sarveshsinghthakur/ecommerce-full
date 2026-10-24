from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.core.security import get_current_user
from backend.app.core.config import settings
from backend.app.models.auth import User
from backend.app.models.commerce import Order
from backend.app.schemas.payment import (
    PaymentInitiateRequest, PaymentInitiateResponse, PaymentStatusResponse
)
from backend.app.services.paytm_service import initiate_order_payment, process_paytm_callback
from backend.app.services.order_service import get_order_by_id

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.post("/paytm/initiate", response_model=PaymentInitiateResponse)
async def initiate_payment(
    payload: PaymentInitiateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    order = get_order_by_id(db, order_id=payload.order_id, user_id=user.id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    result = await initiate_order_payment(db, order)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to initiate payment"))

    return {
        "success": True,
        "order_id": order.id,
        "amount": float(order.total),
        "currency": order.currency,
        "txn_token": result.get("txn_token"),
        "mid": result.get("mid"),
        "checkout_url": result.get("checkout_url"),
        "callback_url": result.get("callback_url")
    }

@router.post("/paytm/callback")
async def paytm_callback(request: Request, db: Session = Depends(get_db)):
    """
    Paytm webhook & browser redirect callback handler.
    Supports both application/x-www-form-urlencoded and application/json.
    """
    content_type = request.headers.get("content-type", "")
    data: Dict[str, Any] = {}
    if "application/x-www-form-urlencoded" in content_type:
        form = await request.form()
        data = dict(form)
    else:
        try:
            data = await request.json()
        except Exception:
            form = await request.form()
            data = dict(form)

    result = await process_paytm_callback(db, data)
    order_id = result.get("order_id")

    # If this was a browser redirect from Paytm, redirect to frontend order status page
    accept = request.headers.get("accept", "")
    if "text/html" in accept and order_id:
        return RedirectResponse(
            url=f"{settings.PAYTM_FRONTEND_RETURN_URL}/{order_id}",
            status_code=303
        )

    return result

@router.get("/paytm/status/{order_id}", response_model=PaymentStatusResponse)
async def get_payment_status(
    order_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    target_user_id = None if user.role == "admin" else user.id
    order = get_order_by_id(db, order_id=order_id, user_id=target_user_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Look up payment record
    from backend.app.models.commerce import Payment
    payment = db.query(Payment).filter(Payment.order_id == order.id).order_by(Payment.created_at.desc()).first()

    return {
        "success": (order.payment_status == "paid"),
        "order_id": order.id,
        "status": order.payment_status,
        "txn_id": payment.provider_payment_id if payment else None,
        "amount": str(order.total),
        "resp_msg": f"Order status is {order.status}"
    }
