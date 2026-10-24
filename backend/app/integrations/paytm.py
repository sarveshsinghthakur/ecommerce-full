import hmac
import hashlib
import json
import logging
from typing import Dict, Any, Optional, Tuple
import httpx
from backend.app.core.config import settings

logger = logging.getLogger("paytm_integration")

class PaytmClient:
    """
    Official Paytm Payment Gateway client supporting All-in-One SDK & API v2.
    Handles Initiate Transaction, Status Inquiry, and Checksum Signature verification.
    """

    def __init__(
        self,
        mid: Optional[str] = None,
        merchant_key: Optional[str] = None,
        environment: Optional[str] = None,
        website: Optional[str] = None,
        callback_url: Optional[str] = None
    ):
        self.mid = mid or settings.PAYTM_MID
        self.merchant_key = merchant_key or settings.PAYTM_MERCHANT_KEY
        self.environment = environment or settings.PAYTM_ENVIRONMENT
        self.website = website or settings.PAYTM_WEBSITE
        self.callback_url = callback_url or settings.PAYTM_CALLBACK_URL

        if self.environment == "production":
            self.base_url = "https://securegw.paytm.in"
        else:
            self.base_url = "https://securegw-stage.paytm.in"

    def generate_signature(self, body_str: str) -> str:
        """
        Generates HMAC-SHA256 signature over the JSON body string using merchant_key.
        """
        signature = hmac.new(
            self.merchant_key.encode("utf-8"),
            body_str.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()
        return signature

    def verify_signature(self, body_str: str, signature: str) -> bool:
        """
        Verifies incoming signature against the body.
        """
        if not signature or not self.merchant_key:
            return False
        expected = self.generate_signature(body_str)
        return hmac.compare_digest(expected, signature)

    async def initiate_transaction(
        self,
        order_id: str,
        amount: float,
        customer_id: str,
        customer_email: Optional[str] = None,
        customer_phone: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calls Paytm /theia/api/v1/initiateTransaction to acquire a transaction token (txnToken).
        """
        formatted_amount = f"{amount:.2f}"
        body = {
            "requestType": "Payment",
            "mid": self.mid,
            "websiteName": self.website,
            "orderId": order_id,
            "callbackUrl": self.callback_url,
            "txnAmount": {
                "value": formatted_amount,
                "currency": "INR"
            },
            "userInfo": {
                "custId": customer_id
            }
        }
        if customer_email:
            body["userInfo"]["email"] = customer_email
        if customer_phone:
            body["userInfo"]["mobile"] = customer_phone

        body_str = json.dumps(body)
        signature = self.generate_signature(body_str)

        payload = {
            "head": {
                "signature": signature
            },
            "body": body
        }

        endpoint = f"{self.base_url}/theia/api/v1/initiateTransaction?mid={self.mid}&orderId={order_id}"

        # If running in local test mode with mock credentials, provide a deterministic staging response
        if self.mid == "TEST_MERCHANT_ID" or "TEST" in self.mid:
            logger.info("Using Paytm staging mock response for order %s", order_id)
            mock_token = f"staging_token_{hashlib.sha1(order_id.encode()).hexdigest()[:24]}"
            return {
                "success": True,
                "txn_token": mock_token,
                "order_id": order_id,
                "mid": self.mid,
                "amount": formatted_amount,
                "callback_url": self.callback_url,
                "checkout_url": f"{self.base_url}/theia/api/v1/showPaymentPage?mid={self.mid}&orderId={order_id}&txnToken={mock_token}"
            }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(endpoint, json=payload)
                data = res.json()
                res_body = data.get("body", {})
                result_info = res_body.get("resultInfo", {})
                
                if result_info.get("resultStatus") == "S":
                    txn_token = res_body.get("txnToken")
                    return {
                        "success": True,
                        "txn_token": txn_token,
                        "order_id": order_id,
                        "mid": self.mid,
                        "amount": formatted_amount,
                        "callback_url": self.callback_url,
                        "checkout_url": f"{self.base_url}/theia/api/v1/showPaymentPage?mid={self.mid}&orderId={order_id}&txnToken={txn_token}"
                    }
                else:
                    logger.error("Paytm initiateTransaction error: %s", result_info)
                    return {
                        "success": False,
                        "error": result_info.get("resultMsg", "Failed to initiate Paytm transaction")
                    }
        except Exception as e:
            logger.exception("Paytm network failure during initiateTransaction")
            return {
                "success": False,
                "error": f"Payment gateway communication error: {str(e)}"
            }

    async def get_transaction_status(self, order_id: str) -> Dict[str, Any]:
        """
        Authoritative transaction status inquiry via /v5/order/status.
        """
        body = {
            "mid": self.mid,
            "orderId": order_id
        }
        body_str = json.dumps(body)
        signature = self.generate_signature(body_str)

        payload = {
            "head": {
                "signature": signature
            },
            "body": body
        }

        endpoint = f"{self.base_url}/v5/order/status"

        if self.mid == "TEST_MERCHANT_ID" or "TEST" in self.mid:
            logger.info("Mock status inquiry for order %s", order_id)
            return {
                "success": True,
                "status": "TXN_SUCCESS",
                "order_id": order_id,
                "txn_id": f"ptm_txn_{hashlib.md5(order_id.encode()).hexdigest()[:16]}",
                "bank_txn_id": "mock_bank_123",
                "resp_code": "01",
                "resp_msg": "Txn Successful (Staging Simulation)"
            }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(endpoint, json=payload)
                data = res.json()
                res_body = data.get("body", {})
                result_info = res_body.get("resultInfo", {})

                status = res_body.get("status") or result_info.get("resultStatus")
                is_success = (status == "TXN_SUCCESS")

                return {
                    "success": is_success,
                    "status": status,
                    "order_id": order_id,
                    "txn_id": res_body.get("txnId"),
                    "bank_txn_id": res_body.get("bankTxnId"),
                    "amount": res_body.get("txnAmount"),
                    "resp_code": res_body.get("resultInfo", {}).get("resultCode"),
                    "resp_msg": res_body.get("resultInfo", {}).get("resultMsg")
                }
        except Exception as e:
            logger.exception("Paytm transaction status query error")
            return {
                "success": False,
                "status": "PENDING",
                "error": str(e)
            }

paytm_client = PaytmClient()
