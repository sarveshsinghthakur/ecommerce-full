import pytest
from backend.app.integrations.paytm import PaytmClient

def test_paytm_checksum_generation_and_verification():
    client = PaytmClient(
        mid="TEST_MID",
        merchant_key="TEST_SECRET_KEY_12345",
        environment="staging"
    )

    body_str = '{"mid":"TEST_MID","orderId":"ord_test_01","amount":"1499.00"}'
    signature = client.generate_signature(body_str)

    assert signature is not None
    assert len(signature) == 64  # SHA256 hex digest length

    # Verify matching signature
    assert client.verify_signature(body_str, signature) is True

    # Tampered body should fail verification
    tampered_body = '{"mid":"TEST_MID","orderId":"ord_test_01","amount":"1.00"}'
    assert client.verify_signature(tampered_body, signature) is False

@pytest.mark.asyncio
async def test_paytm_staging_initiate_transaction():
    client = PaytmClient(mid="TEST_MERCHANT_ID", merchant_key="TEST_KEY")
    result = await client.initiate_transaction(
        order_id="ord_test_02",
        amount=999.00,
        customer_id="cust_test_01",
        customer_email="test@aurorastore.internal"
    )

    assert result["success"] is True
    assert "txn_token" in result
    assert result["amount"] == "999.00"
    assert "checkout_url" in result

@pytest.mark.asyncio
async def test_paytm_staging_get_transaction_status():
    client = PaytmClient(mid="TEST_MERCHANT_ID", merchant_key="TEST_KEY")
    result = await client.get_transaction_status("ord_test_02")

    assert result["success"] is True
    assert result["status"] == "TXN_SUCCESS"
    assert "txn_id" in result
