# Paytm Payment Gateway Integration Guide

## 1. Overview
Aurora Store integrates with the official **Paytm Payment Gateway (v2 All-in-One API)**.
Payments are initiated strictly server-side by the FastAPI backend, and orders are marked `paid` only after cryptographic HMAC-SHA256 signature verification and authoritative transaction status confirmation from Paytm servers.

---

## 2. Configuration & Credentials

### Environment Variables
Set the following keys in your secure `.env.local` or hosting provider secret manager:

```env
# Paytm Gateway Configuration
PAYTM_ENVIRONMENT=staging # Use "production" for live transactions
PAYTM_MID=YOUR_MERCHANT_ID_HERE
PAYTM_MERCHANT_KEY=YOUR_MERCHANT_KEY_HERE
PAYTM_WEBSITE=WEBSTAGING # Or "DEFAULT" in production
PAYTM_CHANNEL_ID=WEB
PAYTM_INDUSTRY_TYPE_ID=Retail
PAYTM_CALLBACK_URL=https://your-domain.com/api/v1/payments/paytm/callback
PAYTM_FRONTEND_RETURN_URL=https://your-domain.com/orders
```

### Staging Test Credentials
In `staging` mode or when `PAYTM_MID=TEST_MERCHANT_ID`, the client enters simulated staging mode, allowing developer end-to-end checkout validation without incurring real financial transactions or triggering payment blocks.

---

## 3. Payment Flow Lifecycle

```
Customer Checkout Request
           │
           ▼
[FastAPI Backend /checkout]
   ├── Validates cart item stock & current selling prices
   ├── Calculates Subtotal, Shipping, Tax (18% GST), Discounts
   └── Persists Order with status="pending_payment"
           │
           ▼
[/api/v1/payments/paytm/initiate]
   ├── Generates HMAC-SHA256 request signature using PAYTM_MERCHANT_KEY
   ├── Calls Paytm /theia/api/v1/initiateTransaction
   └── Returns txnToken and checkout URL
           │
           ▼
[Customer Browser / Paytm Checkout]
   ├── Customer completes UPI / NetBanking / Card payment on Paytm
   └── Paytm posts callback payload to backend
           │
           ▼
[/api/v1/payments/paytm/callback]
   ├── Verifies HMAC-SHA256 signature
   ├── Checks replay protection (idempotency guard)
   ├── Authoritatively polls Paytm /v5/order/status
   ├── If TXN_SUCCESS:
   │     ├── Sets order.payment_status = "paid"
   │     ├── Sets order.status = "confirmed"
   │     └── Creates OrderStatusHistory audit log
   └── Redirects browser to order confirmation page
```

---

## 4. Security & Idempotency Safeguards

1. **No Frontend Secrets:** Merchant Key is strictly confined to Python backend memory. Never exposed in browser JavaScript.
2. **Authoritative Server Verification:** A browser redirect or query parameter never confirms payment; backend queries Paytm status API directly.
3. **Webhook Replay Protection:** If duplicate callbacks or network re-tries occur, the backend detects if `payment_status == "paid"` and skips duplicate credit or inventory adjustments.
4. **No Sensitive Card Data Stored:** Aurora Store never stores or touches raw card numbers, CVVs, or bank PINs.

---

## 5. Testing Checklist

- [x] HMAC-SHA256 checksum generation & validation.
- [x] Staging Initiate Transaction with txnToken generation.
- [x] Authoritative Status Inquiry simulation.
- [x] Correct order total, shipping fee rule, and coupon discount calculation.
- [x] Duplicate callback idempotency check.
