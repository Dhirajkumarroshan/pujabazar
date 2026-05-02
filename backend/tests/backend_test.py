"""PujaBazar backend regression tests."""
import os
import time
import uuid
import requests
import pytest

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE:
    # fallback to read frontend/.env
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
        # try to register
        requests.post(f"{API}/auth/register", json={**CUSTOMER, "name": "Test User"}, timeout=20)
        s, r = _login(**CUSTOMER)
    assert r.status_code == 200, f"customer login failed: {r.text}"
    token = r.json().get("token")
    if token:
        s.headers["Authorization"] = f"Bearer {token}"
    return s


# ---------- Health & Products ----------
def test_health():
    r = requests.get(f"{API}/", timeout=10)
    assert r.status_code == 200


def test_products_list():
    r = requests.get(f"{API}/products", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) >= 1
    assert "id" in data[0] and "name" in data[0] and "price" in data[0]
    assert "_id" not in data[0]


def test_products_filter_category():
    r = requests.get(f"{API}/products", params={"category": "Idols"}, timeout=15)
    assert r.status_code == 200
    for p in r.json():
        assert p.get("category") == "Idols"


def test_products_search():
    r = requests.get(f"{API}/products", params={"q": "diya"}, timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------- Auth ----------
def test_register_duplicate():
    r = requests.post(f"{API}/auth/register",
                      json={"email": ADMIN["email"], "password": "x", "name": "x"}, timeout=15)
    assert r.status_code in (400, 409)


def test_register_new_then_me():
    email = f"test_{uuid.uuid4().hex[:8]}@pujabazar.in"
    s = requests.Session()
    r = s.post(f"{API}/auth/register",
               json={"email": email, "password": "Pass@12345", "name": "TEST_New"}, timeout=15)
    assert r.status_code in (200, 201), r.text
    token = r.json().get("token")
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    me = s.get(f"{API}/auth/me", headers=headers, timeout=15)
    assert me.status_code == 200
    assert me.json().get("email") == email


def test_login_wrong_password():
    r = requests.post(f"{API}/auth/login",
                      json={"email": ADMIN["email"], "password": "WRONG"}, timeout=15)
    assert r.status_code in (400, 401, 403)


def test_me_with_cookie(admin_session):
    # remove bearer to test cookie path
    s = requests.Session()
    s.post(f"{API}/auth/login", json=ADMIN, timeout=15)
    r = s.get(f"{API}/auth/me", timeout=15)
    assert r.status_code == 200
    assert r.json().get("role") == "admin"


def test_logout(admin_session):
    s = requests.Session()
    s.post(f"{API}/auth/login", json=CUSTOMER, timeout=15)
    r = s.post(f"{API}/auth/logout", timeout=15)
    assert r.status_code in (200, 204)


# ---------- Admin RBAC on products ----------
def test_customer_cannot_create_product(customer_session):
    r = customer_session.post(f"{API}/products", json={
        "name": "TEST_x", "price": 1, "category": "Idols", "image": "", "description": "x"
    }, timeout=15)
    assert r.status_code in (401, 403)


@pytest.fixture(scope="module")
def created_product(admin_session):
    payload = {
        "name": f"TEST_Prod_{uuid.uuid4().hex[:6]}",
        "price": 199, "category": "Idols",
        "image": "https://example.com/x.jpg",
        "description": "test product", "stock": 10
    }
    r = admin_session.post(f"{API}/products", json=payload, timeout=15)
    assert r.status_code in (200, 201), r.text
    p = r.json()
    assert p["name"] == payload["name"]
    assert "id" in p
    yield p
    admin_session.delete(f"{API}/products/{p['id']}", timeout=15)


def test_admin_update_product(admin_session, created_product):
    pid = created_product["id"]
    r = admin_session.put(f"{API}/products/{pid}", json={"price": 299}, timeout=15)
    assert r.status_code == 200
    g = requests.get(f"{API}/products/{pid}", timeout=15)
    assert g.status_code == 200
    assert g.json()["price"] == 299


def test_admin_delete_product(admin_session):
    payload = {"name": f"TEST_Del_{uuid.uuid4().hex[:6]}", "price": 50, "category": "Idols",
               "image": "", "description": "d"}
    r = admin_session.post(f"{API}/products", json=payload, timeout=15)
    pid = r.json()["id"]
    d = admin_session.delete(f"{API}/products/{pid}", timeout=15)
    assert d.status_code in (200, 204)
    g = requests.get(f"{API}/products/{pid}", timeout=15)
    assert g.status_code == 404


# ---------- Checkout / Orders ----------
def _checkout_payload(items, method):
    return {
        "items": items,
        "shipping_address": {
            "full_name": "TEST User", "phone": "9999999999",
            "address_line1": "1 Lane", "city": "Pune",
            "state": "MH", "postal_code": "411001", "country": "IN"
        },
        "payment_method": method
    }


def test_checkout_cod(customer_session):
    products = requests.get(f"{API}/products", timeout=15).json()
    p = products[0]
    items = [{"product_id": p["id"], "quantity": 2}]
    r = customer_session.post(f"{API}/checkout", json=_checkout_payload(items, "cod"), timeout=20)
    assert r.status_code in (200, 201), r.text
    data = r.json()
    assert "order_id" in data or "id" in data or data.get("order")


def test_checkout_razorpay_mock(customer_session):
    products = requests.get(f"{API}/products", timeout=15).json()
    p = products[0]
    items = [{"product_id": p["id"], "quantity": 1}]
    r = customer_session.post(f"{API}/checkout", json=_checkout_payload(items, "razorpay"), timeout=20)
    assert r.status_code in (200, 201), r.text
    data = r.json()
    assert data.get("mock") is True, f"expected mock:true, got {data}"


def test_user_orders(customer_session):
    r = customer_session.get(f"{API}/orders", timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_admin_orders_and_status(admin_session):
    r = admin_session.get(f"{API}/admin/orders", timeout=15)
    assert r.status_code == 200
    orders = r.json()
    assert isinstance(orders, list)
    if orders:
        oid = orders[0].get("id") or orders[0].get("order_id")
        if oid:
            u = admin_session.put(f"{API}/admin/orders/{oid}/status",
                                  json={"status": "processing"}, timeout=15)
            assert u.status_code == 200


def test_admin_stats(admin_session):
    r = admin_session.get(f"{API}/admin/stats", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)


def test_customer_cannot_access_admin(customer_session):
    r = customer_session.get(f"{API}/admin/stats", timeout=15)
    assert r.status_code in (401, 403)
