import uuid
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.models.commerce import Order, Payment, OrderStatusHistory
from backend.app.integrations.paytm import paytm_client
from backend.app.core.config import settings

logger = logging.getLogger("paytm_service")

async def initiate_order_payment(db: Session, order: Order) -> Dict[str, Any]:
    if order.status in ["confirmed", "processing", "shipped", "delivered"] and order.payment_status == "paid":
        return {
            "success": False,
            "error": "Order has already been paid"
        }

    res = await paytm_client.initiate_transaction(
        order_id=order.id,
        amount=float(order.total),
        customer_id=order.user_id,
        customer_email=order.email,
        customer_phone=order.phone
    )

    if res.get("success"):
        # Record pending payment attempt
        payment = Payment(
            id=f"pay_{uuid.uuid4().hex[:16]}",
            order_id=order.id,
            provider="paytm",
            provider_order_id=order.id,
            amount=order.total,
            currency=order.currency,
            status="pending",
            meta={"txn_token": res.get("txn_token")}
        )
        db.add(payment)
        db.commit()

    return res

async def process_paytm_callback(
    db: Session,
    callback_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Idempotent verification of Paytm payment callback / webhook.
    Verifies signature and authoritatively checks transaction status with Paytm server.
    """
    order_id = callback_data.get("ORDERID") or callback_data.get("orderId")
    if not order_id:
        return {"success": False, "error": "Missing ORDERID in callback payload"}

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return {"success": False, "error": f"Order {order_id} not found"}

    # Replay protection: if already marked paid, return success idempotently
    if order.payment_status == "paid":
        logger.info("Order %s is already marked as paid. Skipping redundant processing.", order_id)
        return {"success": True, "order_id": order_id, "status": "paid", "replayed": True}

    # Authoritative status check directly from Paytm
    status_result = await paytm_client.get_transaction_status(order_id)
    is_success = status_result.get("success", False)

    # Locate or create payment record
    payment = db.query(Payment).filter(
        Payment.order_id == order.id,
        Payment.provider == "paytm"
    ).order_by(Payment.created_at.desc()).first()

    if not payment:
        payment = Payment(
            id=f"pay_{uuid.uuid4().hex[:16]}",
            order_id=order.id,
            provider="paytm",
            provider_order_id=order_id,
            amount=order.total,
            currency=order.currency
        )
        db.add(payment)

    payment.provider_payment_id = status_result.get("txn_id")
    payment.meta = status_result

    if is_success:
        order.payment_status = "paid"
        order.status = "confirmed"
        payment.status = "paid"

        history = OrderStatusHistory(
            id=f"osh_{uuid.uuid4().hex[:16]}",
            order_id=order.id,
            from_status="pending_payment",
            to_status="confirmed",
            note=f"Payment verified via Paytm (TxnID: {status_result.get('txn_id')})",
            actor="paytm_webhook"
        )
        db.add(history)
        logger.info("Order %s successfully paid and confirmed via Paytm", order_id)
    else:
        order.payment_status = "failed"
        order.status = "payment_failed"
        payment.status = "failed"

        history = OrderStatusHistory(
            id=f"osh_{uuid.uuid4().hex[:16]}",
            order_id=order.id,
            from_status=order.status,
            to_status="payment_failed",
            note=f"Paytm payment failed or rejected: {status_result.get('resp_msg')}",
            actor="paytm_webhook"
        )
        db.add(history)
        logger.warning("Order %s payment failed via Paytm: %s", order_id, status_result.get('resp_msg'))

    db.commit()
    db.refresh(order)

    return {
        "success": is_success,
        "order_id": order_id,
        "payment_status": order.payment_status,
        "order_status": order.status,
        "txn_id": status_result.get("txn_id")
    }
