"""PujaBazar backend regression tests (production-readiness pass)."""
import os
import uuid
import requests
import pytest

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE:
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except Exception:
        pass
API = f"{BASE}/api"

ADMIN = {"email": "admin@pujabazar.in", "password": "Admin@12345"}
CUSTOMER = {"email": "test@pujabazar.in", "password": "Test@12345"}

VALID_ADDRESS = {
    "full_name": "TEST User",
    "phone": "9999999999",
    "line1": "1 Test Lane",
    "line2": "Apt 2",
    "city": "Pune",
    "state": "MH",
    "pincode": "411001",
}


def _login(email, password):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    return s, r


@pytest.fixture(scope="module")
def admin_session():
    s, r = _login(**ADMIN)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    token = r.json().get("token")
    if token:
        s.headers["Authorization"] = f"Bearer {token}"
    return s


@pytest.fixture(scope="module")
def customer_session():
    s, r = _login(**CUSTOMER)
    if r.status_code != 200:
        requests.post(f"{API}/auth/register",
                      json={**CUSTOMER, "name": "Test User"}, timeout=20)
        s, r = _login(**CUSTOMER)
    assert r.status_code == 200, f"customer login failed: {r.text}"
    token = r.json().get("token")
    if token:
        s.headers["Authorization"] = f"Bearer {token}"
    return s


# -------- Health & Config --------
def test_health():
    r = requests.get(f"{API}/health", timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert j.get("ok") is True and j.get("db") == "up"


def test_root():
    r = requests.get(f"{API}/", timeout=10)
    assert r.status_code == 200


def test_public_config():
    r = requests.get(f"{API}/config", timeout=10)
    assert r.status_code == 200
    assert "razorpay_key_id" in r.json()


# -------- Products --------
def test_products_list():
    r = requests.get(f"{API}/products", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) >= 1
    p = data[0]
    assert "product_id" in p and "name" in p and "price" in p
    assert "_id" not in p


def test_products_filter_category():
    r = requests.get(f"{API}/products", params={"category": "Murti"}, timeout=15)
    assert r.status_code == 200
    for p in r.json():
        assert p.get("category") == "Murti"


def test_products_search_q():
    r = requests.get(f"{API}/products", params={"q": "diya"}, timeout=15)
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    for p in items:
        assert "diya" in p["name"].lower()


def test_products_price_range_and_sort_asc():
    r = requests.get(f"{API}/products",
                     params={"min_price": 100, "max_price": 500, "sort": "price_asc"},
                     timeout=15)
    assert r.status_code == 200
    items = r.json()
    prices = [p["price"] for p in items]
    assert all(100 <= x <= 500 for x in prices)
    assert prices == sorted(prices)


def test_products_sort_desc_and_name_asc():
    r1 = requests.get(f"{API}/products", params={"sort": "price_desc"}, timeout=15).json()
    assert [p["price"] for p in r1] == sorted([p["price"] for p in r1], reverse=True)
    r2 = requests.get(f"{API}/products", params={"sort": "name_asc"}, timeout=15).json()
    names = [p["name"] for p in r2]
    assert names == sorted(names)


def test_product_detail_404():
    r = requests.get(f"{API}/products/prod_doesnotexist", timeout=15)
    assert r.status_code == 404


def test_product_detail_ok():
    p0 = requests.get(f"{API}/products", timeout=15).json()[0]
    r = requests.get(f"{API}/products/{p0['product_id']}", timeout=15)
    assert r.status_code == 200
    assert r.json()["product_id"] == p0["product_id"]


# -------- Auth --------
def test_register_duplicate():
    r = requests.post(f"{API}/auth/register",
                      json={"email": ADMIN["email"], "password": "xxxxxx", "name": "x"},
                      timeout=15)
    assert r.status_code in (400, 409)


def test_register_login_me_logout_flow():
    email = f"test_{uuid.uuid4().hex[:8]}@pujabazar.in"
    s = requests.Session()
    r = s.post(f"{API}/auth/register",
               json={"email": email, "password": "Pass@12345", "name": "TEST_New"},
               timeout=15)
    assert r.status_code in (200, 201), r.text
    token = r.json().get("token")
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    me = s.get(f"{API}/auth/me", headers=headers, timeout=15)
    assert me.status_code == 200
    assert me.json().get("email") == email
    out = s.post(f"{API}/auth/logout", timeout=15)
    assert out.status_code == 200


def test_login_wrong_password():
    r = requests.post(f"{API}/auth/login",
                      json={"email": ADMIN["email"], "password": "WRONG"}, timeout=15)
    assert r.status_code == 401


def test_me_unauthenticated():
    r = requests.get(f"{API}/auth/me", timeout=15)
    assert r.status_code == 401


# -------- Checkout / Validation --------
def _items_for(qty=1):
    products = requests.get(f"{API}/products", timeout=15).json()
    return [{"product_id": products[0]["product_id"], "qty": qty}]


def test_checkout_invalid_phone(customer_session):
    bad = {**VALID_ADDRESS, "phone": "12345"}  # not 10 digits, not 6-9 start
    r = customer_session.post(f"{API}/checkout", json={
        "items": _items_for(1), "address": bad, "payment_method": "cod"
    }, timeout=20)
    assert r.status_code == 422


def test_checkout_invalid_pincode(customer_session):
    bad = {**VALID_ADDRESS, "pincode": "12"}
    r = customer_session.post(f"{API}/checkout", json={
        "items": _items_for(1), "address": bad, "payment_method": "cod"
    }, timeout=20)
    assert r.status_code == 422


def test_checkout_cod_success_and_stock_decrement(customer_session):
    products = requests.get(f"{API}/products", timeout=15).json()
    p = products[0]
    pid = p["product_id"]
    before = requests.get(f"{API}/products/{pid}", timeout=15).json()["stock"]

    r = customer_session.post(f"{API}/checkout", json={
        "items": [{"product_id": pid, "qty": 2}],
        "address": VALID_ADDRESS, "payment_method": "cod"
    }, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "order" in data
    assert data["order"]["payment_method"] == "cod"
    assert data["order"]["payment_status"] == "cod"
    order_id = data["order"]["order_id"]

    after = requests.get(f"{API}/products/{pid}", timeout=15).json()["stock"]
    assert after == before - 2, f"stock not decremented {before}->{after}"
    return order_id


def test_checkout_razorpay_mock(customer_session):
    r = customer_session.post(f"{API}/checkout", json={
        "items": _items_for(1), "address": VALID_ADDRESS, "payment_method": "razorpay"
    }, timeout=20)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j.get("mock") is True
    assert j["order"]["payment_status"] == "test_mode"


def test_checkout_insufficient_stock(customer_session):
    p = requests.get(f"{API}/products", timeout=15).json()[0]
    r = customer_session.post(f"{API}/checkout", json={
        "items": [{"product_id": p["product_id"], "qty": 99}],
        "address": VALID_ADDRESS, "payment_method": "cod"
    }, timeout=20)
    # qty<=99 allowed by model, but stock check may fire if seeded < 99 for that product
    # If product has >=99 stock, request would succeed; pick a product with low stock.
    if r.status_code == 200:
        # Try a product with limited seed stock
        for prod in requests.get(f"{API}/products", timeout=15).json():
            if prod.get("stock", 999) < 99:
                rr = customer_session.post(f"{API}/checkout", json={
                    "items": [{"product_id": prod["product_id"], "qty": 99}],
                    "address": VALID_ADDRESS, "payment_method": "cod"
                }, timeout=20)
                assert rr.status_code == 400
                return
        pytest.skip("All seed products have stock>=99")
    else:
        assert r.status_code == 400


def test_user_orders(customer_session):
    r = customer_session.get(f"{API}/orders", timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# -------- Cancel order restores stock --------
def test_cancel_order_restores_stock(admin_session, customer_session):
    p = requests.get(f"{API}/products", timeout=15).json()[0]
    pid = p["product_id"]
    before = requests.get(f"{API}/products/{pid}", timeout=15).json()["stock"]
    r = customer_session.post(f"{API}/checkout", json={
        "items": [{"product_id": pid, "qty": 3}],
        "address": VALID_ADDRESS, "payment_method": "cod"
    }, timeout=20)
    assert r.status_code == 200, r.text
    order_id = r.json()["order"]["order_id"]
    mid = requests.get(f"{API}/products/{pid}", timeout=15).json()["stock"]
    assert mid == before - 3

    u = admin_session.put(f"{API}/admin/orders/{order_id}/status",
                          json={"status": "cancelled"}, timeout=15)
    assert u.status_code == 200
    after = requests.get(f"{API}/products/{pid}", timeout=15).json()["stock"]
    assert after == before, f"stock not restored {before}->{after}"


# -------- Webhook (no secret configured) --------
def test_webhook_no_secret_returns_ok_false():
    r = requests.post(f"{API}/payments/webhook",
                      data=b"{}", headers={"X-Razorpay-Signature": "x"}, timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert j.get("ok") is False
    assert j.get("reason") == "webhook_secret_not_configured"


# -------- Admin --------
def test_customer_cannot_access_admin(customer_session):
    r = customer_session.get(f"{API}/admin/stats", timeout=15)
    assert r.status_code == 403


def test_admin_unauthenticated():
    r = requests.get(f"{API}/admin/stats", timeout=15)
    assert r.status_code == 401


def test_admin_stats(admin_session):
    r = admin_session.get(f"{API}/admin/stats", timeout=15)
    assert r.status_code == 200
    data = r.json()
    for k in ("total_orders", "revenue", "customers", "products", "low_stock"):
        assert k in data


def test_admin_orders_list(admin_session):
    r = admin_session.get(f"{API}/admin/orders", timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_admin_order_detail(admin_session):
    orders = admin_session.get(f"{API}/admin/orders", timeout=15).json()
    if not orders:
        pytest.skip("no orders to check")
    oid = orders[0]["order_id"]
    r = admin_session.get(f"{API}/admin/orders/{oid}", timeout=15)
    assert r.status_code == 200
    assert r.json()["order_id"] == oid
    r2 = admin_session.get(f"{API}/admin/orders/ord_doesnotexist", timeout=15)
    assert r2.status_code == 404


def test_admin_customers(admin_session):
    r = admin_session.get(f"{API}/admin/customers", timeout=15)
    assert r.status_code == 200
    customers = r.json()
    assert isinstance(customers, list) and len(customers) >= 1
    c = customers[0]
    assert "order_count" in c and "total_spend" in c
    assert "password_hash" not in c


def test_admin_export_orders_csv(admin_session):
    r = admin_session.get(f"{API}/admin/export/orders.csv", timeout=20)
    assert r.status_code == 200
    assert "text/csv" in r.headers.get("content-type", "")
    body = r.text
    assert "order_id" in body.split("\n")[0]


def test_admin_csv_requires_admin(customer_session):
    r = customer_session.get(f"{API}/admin/export/orders.csv", timeout=15)
    assert r.status_code == 403


# -------- Admin product CRUD --------
def test_admin_product_crud(admin_session):
    payload = {
        "name": f"TEST_Prod_{uuid.uuid4().hex[:6]}",
        "price": 199, "category": "Murti",
        "image": "https://example.com/x.jpg",
        "description": "test product", "stock": 10,
    }
    r = admin_session.post(f"{API}/products", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    p = r.json()
    pid = p["product_id"]
    # update
    payload["price"] = 299
    u = admin_session.put(f"{API}/products/{pid}", json=payload, timeout=15)
    assert u.status_code == 200
    g = requests.get(f"{API}/products/{pid}", timeout=15)
    assert g.status_code == 200 and g.json()["price"] == 299
    # delete
    d = admin_session.delete(f"{API}/products/{pid}", timeout=15)
    assert d.status_code == 200
    g2 = requests.get(f"{API}/products/{pid}", timeout=15)
    assert g2.status_code == 404
