from backend.app.services.order_service import calculate_order_totals

def test_order_calculation_under_threshold():
    items = [
        {"unit_price": 400.0, "quantity": 1}
    ]
    # Subtotal 400 < 999 -> shipping 99, tax 18% of 400 = 72, total = 571
    totals = calculate_order_totals(items)
    assert totals["subtotal"] == 400.0
    assert totals["shipping_amount"] == 99.0
    assert totals["tax_amount"] == 72.0
    assert totals["total"] == 571.0

def test_order_calculation_free_shipping():
    items = [
        {"unit_price": 1200.0, "quantity": 1}
    ]
    # Subtotal 1200 >= 999 -> shipping 0, tax 18% of 1200 = 216, total = 1416
    totals = calculate_order_totals(items)
    assert totals["subtotal"] == 1200.0
    assert totals["shipping_amount"] == 0.0
    assert totals["tax_amount"] == 216.0
    assert totals["total"] == 1416.0

def test_order_calculation_with_coupon():
    items = [
        {"unit_price": 1000.0, "quantity": 1}
    ]
    # SAVE10: 10% discount = 100, subtotal is 1000 >= 999 so shipping is free (0.0), tax 18% of 900 = 162
    totals = calculate_order_totals(items, coupon_code="SAVE10")
    assert totals["subtotal"] == 1000.0
    assert totals["discount_amount"] == 100.0
    assert totals["shipping_amount"] == 0.0
    assert totals["tax_amount"] == 162.0
    assert totals["total"] == 1062.0
