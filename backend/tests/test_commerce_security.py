import pytest


@pytest.mark.parametrize("method", ["patch", "delete"])
def test_cart_mutation_cannot_touch_another_users_item(client, db, shop, method):
    kwargs = {"json": {"quantity": 1}} if method == "patch" else {}
    response = getattr(client, method)("/api/v1/cart/items/owner-item", **kwargs)
    assert response.status_code == 404
    db.expire_all()
    from backend.app.models.commerce import CartItem
    assert db.get(CartItem, "owner-item").quantity == 2