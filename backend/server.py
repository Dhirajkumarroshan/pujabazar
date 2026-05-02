from dotenv import load_dotenv
load_dotenv()

import os
import uuid
import csv
import io
import re
import hmac
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List

import bcrypt
import jwt
import httpx
from fastapi import FastAPI, HTTPException, Request, Response, Depends, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, PlainTextResponse
from pydantic import BaseModel, EmailStr, Field, field_validator
from motor.motor_asyncio import AsyncIOMotorClient
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Optional Razorpay
try:
    import razorpay
except Exception:
    razorpay = None

logger = logging.getLogger("pujabazar")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s :: %(message)s")

# ---------------- Config ----------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@pujabazar.in")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin@12345")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")

mongo = AsyncIOMotorClient(MONGO_URL)
db = mongo[DB_NAME]

razorpay_client = None
if razorpay and RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# ---------------- Utilities ----------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def create_jwt(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": now_utc() + timedelta(days=7),
        "iat": now_utc(), "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def set_auth_cookie(response: Response, token: str, max_age: int = 7 * 24 * 3600):
    response.set_cookie(
        key="access_token", value=token, httponly=True, secure=True,
        samesite="none", max_age=max_age, path="/",
    )

def clear_auth_cookies(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("session_token", path="/")

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
            user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0, "password_hash": 0})
            if user:
                return user
        except jwt.PyJWTError:
            pass
    session_token = request.cookies.get("session_token")
    if session_token:
        sess = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if sess:
            exp = sess.get("expires_at")
            if isinstance(exp, str):
                exp = datetime.fromisoformat(exp)
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp >= now_utc():
                user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0, "password_hash": 0})
                if user:
                    return user
    raise HTTPException(status_code=401, detail="Not authenticated")

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user

def send_email_stub(to: str, subject: str, body: str):
    """Pluggable email sender. Replace with SendGrid/Resend/SMTP later."""
    logger.info(f"[EMAIL] to={to} | subject={subject!r} | body_preview={body[:120]!r}")

# ---------------- Models ----------------
PHONE_RE = re.compile(r"^[6-9]\d{9}$")
PINCODE_RE = re.compile(r"^\d{6}$")

class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=80)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ProductIn(BaseModel):
    name: str
    price: int = Field(ge=0)
    mrp: Optional[int] = None
    image: str
    category: str
    description: Optional[str] = ""
    stock: int = Field(default=100, ge=0)
    featured: bool = False

class AddressIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=80)
    phone: str
    line1: str = Field(min_length=3, max_length=200)
    line2: Optional[str] = ""
    city: str = Field(min_length=2, max_length=60)
    state: str = Field(min_length=2, max_length=60)
    pincode: str

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        v = re.sub(r"\D", "", v or "")
        if not PHONE_RE.match(v):
            raise ValueError("Phone must be a valid 10-digit Indian number starting with 6-9")
        return v

    @field_validator("pincode")
    @classmethod
    def _pin(cls, v: str) -> str:
        v = (v or "").strip()
        if not PINCODE_RE.match(v):
            raise ValueError("PIN code must be 6 digits")
        return v

class CartItemIn(BaseModel):
    product_id: str
    qty: int = Field(ge=1, le=99)

class CheckoutIn(BaseModel):
    items: List[CartItemIn]
    address: AddressIn
    payment_method: str  # "razorpay" | "cod"

    @field_validator("payment_method")
    @classmethod
    def _pm(cls, v: str) -> str:
        if v not in {"razorpay", "cod"}:
            raise ValueError("payment_method must be razorpay or cod")
        return v

class VerifyPaymentIn(BaseModel):
    order_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class OrderStatusIn(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def _s(cls, v: str) -> str:
        if v not in {"pending", "confirmed", "shipped", "delivered", "cancelled"}:
            raise ValueError("Invalid status")
        return v

# ---------------- App ----------------
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="PujaBazar API", docs_url="/api/docs", openapi_url="/api/openapi.json")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

api = APIRouter(prefix="/api")

# Allow FRONTEND_URL + localhost; regex for any emergentagent preview subdomain
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_origin_regex=r"https://.*\.preview\.emergentagent\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Health ----------
@api.get("/")
async def root():
    return {"ok": True, "service": "pujabazar"}

@api.get("/health")
async def health():
    try:
        await db.command("ping")
        return {"ok": True, "db": "up", "time": now_utc().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"db down: {e}")

@api.get("/config")
async def public_config():
    return {"razorpay_key_id": RAZORPAY_KEY_ID or None}

# ---------- Auth ----------
@api.post("/auth/register")
@limiter.limit("10/minute")
async def register(request: Request, payload: RegisterIn, response: Response):
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id, "name": payload.name.strip(), "email": email,
        "password_hash": hash_password(payload.password), "role": "customer",
        "auth_provider": "password", "created_at": now_utc(),
    }
    await db.users.insert_one(user_doc)
    send_email_stub(email, "Welcome to PujaBazar.in", f"Hi {user_doc['name']}, welcome!")
    token = create_jwt(user_id, email, "customer")
    set_auth_cookie(response, token)
    return {"user_id": user_id, "name": user_doc["name"], "email": email, "role": "customer", "token": token}

@api.post("/auth/login")
@limiter.limit("20/minute")
async def login(request: Request, payload: LoginIn, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_jwt(user["user_id"], email, user.get("role", "customer"))
    set_auth_cookie(response, token)
    return {
        "user_id": user["user_id"], "name": user.get("name", ""), "email": email,
        "role": user.get("role", "customer"), "token": token,
    }

@api.post("/auth/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    user.pop("password_hash", None)
    return user

@api.post("/auth/emergent-session")
async def emergent_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
        )
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        data = r.json()
    email = (data.get("email") or "").lower().strip()
    name = data.get("name") or ""
    picture = data.get("picture") or ""
    session_token = data["session_token"]

    user = await db.users.find_one({"email": email})
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id, "email": email, "name": name, "picture": picture,
            "role": "customer", "auth_provider": "google", "created_at": now_utc(),
        })
    else:
        user_id = user["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": name or user.get("name", ""), "picture": picture}})

    expires_at = now_utc() + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": session_token, "expires_at": expires_at, "created_at": now_utc(),
    })
    response.set_cookie(
        key="session_token", value=session_token, httponly=True, secure=True,
        samesite="none", max_age=7 * 24 * 3600, path="/",
    )
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return user_doc

# ---------- Products ----------
@api.get("/products")
async def list_products(category: Optional[str] = None, q: Optional[str] = None,
                        featured: Optional[bool] = None,
                        min_price: Optional[int] = None, max_price: Optional[int] = None,
                        sort: Optional[str] = None):
    query: dict = {}
    if category:
        query["category"] = category
    if featured is not None:
        query["featured"] = featured
    if q:
        query["name"] = {"$regex": re.escape(q), "$options": "i"}
    if min_price is not None or max_price is not None:
        pr: dict = {}
        if min_price is not None:
            pr["$gte"] = min_price
        if max_price is not None:
            pr["$lte"] = max_price
        query["price"] = pr
    sort_spec = [("created_at", -1)]
    if sort == "price_asc":
        sort_spec = [("price", 1)]
    elif sort == "price_desc":
        sort_spec = [("price", -1)]
    elif sort == "name_asc":
        sort_spec = [("name", 1)]
    cursor = db.products.find(query, {"_id": 0}).sort(sort_spec)
    return await cursor.to_list(length=500)

@api.get("/products/{product_id}")
async def get_product(product_id: str):
    p = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    return p

@api.post("/products")
async def create_product(payload: ProductIn, _: dict = Depends(require_admin)):
    product_id = f"prod_{uuid.uuid4().hex[:10]}"
    doc = payload.model_dump()
    doc.update({"product_id": product_id, "created_at": now_utc()})
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/products/{product_id}")
async def update_product(product_id: str, payload: ProductIn, _: dict = Depends(require_admin)):
    res = await db.products.update_one({"product_id": product_id}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return await db.products.find_one({"product_id": product_id}, {"_id": 0})

@api.delete("/products/{product_id}")
async def delete_product(product_id: str, _: dict = Depends(require_admin)):
    res = await db.products.delete_one({"product_id": product_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}

# ---------- Orders / Checkout ----------
async def _compute_order(items_in: List[CartItemIn]):
    """Validate stock, compute totals. Does NOT decrement stock."""
    items = []
    subtotal = 0
    for ci in items_in:
        if ci.qty <= 0:
            continue
        p = await db.products.find_one({"product_id": ci.product_id}, {"_id": 0})
        if not p:
            raise HTTPException(status_code=400, detail=f"Invalid product: {ci.product_id}")
        if p.get("stock", 0) < ci.qty:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {p['name']}")
        line_total = p["price"] * ci.qty
        subtotal += line_total
        items.append({
            "product_id": p["product_id"], "name": p["name"], "image": p["image"],
            "price": p["price"], "qty": ci.qty, "line_total": line_total,
        })
    if not items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    shipping = 0 if subtotal >= 999 else 79
    total = subtotal + shipping
    return items, subtotal, shipping, total

async def _decrement_stock(items: List[dict]):
    """Atomic stock decrement via conditional update. Rolls back on failure."""
    decremented: List[tuple] = []
    try:
        for it in items:
            res = await db.products.update_one(
                {"product_id": it["product_id"], "stock": {"$gte": it["qty"]}},
                {"$inc": {"stock": -it["qty"]}},
            )
            if res.modified_count != 1:
                raise HTTPException(status_code=409, detail=f"Stock unavailable for {it['name']}")
            decremented.append((it["product_id"], it["qty"]))
    except Exception:
        for pid, qty in decremented:
            await db.products.update_one({"product_id": pid}, {"$inc": {"stock": qty}})
        raise

async def _restore_stock(items: List[dict]):
    for it in items:
        await db.products.update_one({"product_id": it["product_id"]}, {"$inc": {"stock": it["qty"]}})

@api.post("/checkout")
async def checkout(payload: CheckoutIn, user: dict = Depends(get_current_user)):
    items, subtotal, shipping, total = await _compute_order(payload.items)
    discount = 0
    if payload.payment_method == "razorpay":
        discount = round(total * 0.05)
    final_total = total - discount

    order_id = f"ord_{uuid.uuid4().hex[:12]}"
    order_doc = {
        "order_id": order_id, "user_id": user["user_id"],
        "user_email": user.get("email"), "user_name": user.get("name"),
        "items": items, "address": payload.address.model_dump(),
        "payment_method": payload.payment_method,
        "subtotal": subtotal, "shipping": shipping, "discount": discount, "total": final_total,
        "status": "pending", "payment_status": "pending",
        "razorpay_order_id": None, "created_at": now_utc(),
    }

    # Decrement stock first (atomic)
    await _decrement_stock(items)

    if payload.payment_method == "razorpay":
        if not razorpay_client:
            order_doc["payment_status"] = "test_mode"
            await db.orders.insert_one(order_doc)
            order_doc.pop("_id", None)
            send_email_stub(order_doc.get("user_email") or "", f"Order {order_id} received",
                            f"Your order {order_id} for ₹{final_total} is confirmed (test mode).")
            return {"order": order_doc, "razorpay": None, "mock": True}
        try:
            rp = razorpay_client.order.create({
                "amount": final_total * 100, "currency": "INR",
                "receipt": order_id[:40], "payment_capture": 1,
                "notes": {"order_id": order_id, "user_id": user["user_id"]},
            })
        except Exception as e:
            await _restore_stock(items)
            raise HTTPException(status_code=502, detail=f"Payment gateway error: {e}")
        order_doc["razorpay_order_id"] = rp["id"]
        await db.orders.insert_one(order_doc)
        order_doc.pop("_id", None)
        return {
            "order": order_doc,
            "razorpay": {"key_id": RAZORPAY_KEY_ID, "order_id": rp["id"],
                         "amount": rp["amount"], "currency": rp["currency"]},
        }
    else:
        order_doc["status"] = "confirmed"
        order_doc["payment_status"] = "cod"
        await db.orders.insert_one(order_doc)
        order_doc.pop("_id", None)
        send_email_stub(order_doc.get("user_email") or "", f"Order {order_id} confirmed",
                        f"Your COD order {order_id} for ₹{final_total} is confirmed.")
        return {"order": order_doc, "razorpay": None}

@api.post("/payments/verify")
async def verify_payment(payload: VerifyPaymentIn, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"order_id": payload.order_id, "user_id": user["user_id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not razorpay_client:
        await db.orders.update_one(
            {"order_id": payload.order_id},
            {"$set": {"status": "confirmed", "payment_status": "paid",
                      "razorpay_payment_id": payload.razorpay_payment_id}},
        )
        send_email_stub(order.get("user_email") or "", f"Payment received — {payload.order_id}",
                        "Thank you for your payment.")
        return {"ok": True, "mock": True}
    try:
        razorpay_client.utility.verify_payment_signature({
            "razorpay_order_id": payload.razorpay_order_id,
            "razorpay_payment_id": payload.razorpay_payment_id,
            "razorpay_signature": payload.razorpay_signature,
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Signature verification failed")
    await db.orders.update_one(
        {"order_id": payload.order_id},
        {"$set": {"status": "confirmed", "payment_status": "paid",
                  "razorpay_payment_id": payload.razorpay_payment_id}},
    )
    send_email_stub(order.get("user_email") or "", f"Payment received — {payload.order_id}",
                    "Thank you for your payment.")
    return {"ok": True}

@api.post("/payments/webhook")
async def razorpay_webhook(request: Request):
    """Razorpay server-to-server webhook. Verifies HMAC via webhook secret."""
    raw = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    if not RAZORPAY_WEBHOOK_SECRET:
        logger.warning("Webhook received but RAZORPAY_WEBHOOK_SECRET not set")
        return {"ok": False, "reason": "webhook_secret_not_configured"}
    expected = hmac.new(RAZORPAY_WEBHOOK_SECRET.encode(), raw, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=400, detail="Invalid signature")
    try:
        import json
        payload = json.loads(raw.decode())
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    event = payload.get("event", "")
    entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    rp_order_id = entity.get("order_id")
    rp_payment_id = entity.get("id")
    if event in {"payment.captured", "payment.authorized"} and rp_order_id:
        await db.orders.update_one(
            {"razorpay_order_id": rp_order_id},
            {"$set": {"status": "confirmed", "payment_status": "paid",
                      "razorpay_payment_id": rp_payment_id,
                      "webhook_event": event, "webhook_at": now_utc()}},
        )
    elif event == "payment.failed" and rp_order_id:
        await db.orders.update_one(
            {"razorpay_order_id": rp_order_id},
            {"$set": {"payment_status": "failed", "webhook_event": event, "webhook_at": now_utc()}},
        )
    return {"ok": True, "event": event}

@api.get("/orders")
async def my_orders(user: dict = Depends(get_current_user)):
    cur = db.orders.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1)
    return await cur.to_list(length=200)

# ---------- Admin ----------
@api.get("/admin/orders")
async def admin_orders(_: dict = Depends(require_admin)):
    cur = db.orders.find({}, {"_id": 0}).sort("created_at", -1)
    return await cur.to_list(length=500)

@api.get("/admin/orders/{order_id}")
async def admin_order_detail(order_id: str, _: dict = Depends(require_admin)):
    o = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Not found")
    return o

@api.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, payload: OrderStatusIn, _: dict = Depends(require_admin)):
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    # If cancelling, restore stock
    if payload.status == "cancelled" and order.get("status") != "cancelled":
        await _restore_stock(order.get("items", []))
    await db.orders.update_one({"order_id": order_id}, {"$set": {"status": payload.status}})
    send_email_stub(order.get("user_email") or "", f"Order {order_id} — {payload.status}",
                    f"Your order status is now: {payload.status}.")
    return {"ok": True}

@api.get("/admin/stats")
async def admin_stats(_: dict = Depends(require_admin)):
    total_orders = await db.orders.count_documents({})
    paid_orders = await db.orders.count_documents({"payment_status": {"$in": ["paid", "cod"]}})
    rev = 0
    async for r in db.orders.aggregate([
        {"$match": {"payment_status": {"$in": ["paid", "cod"]}}},
        {"$group": {"_id": None, "rev": {"$sum": "$total"}}},
    ]):
        rev = r.get("rev", 0)
    customers = await db.users.count_documents({"role": "customer"})
    products = await db.products.count_documents({})
    aov = round(rev / paid_orders) if paid_orders else 0
    low_stock = await db.products.count_documents({"stock": {"$lt": 10}})
    return {
        "total_orders": total_orders, "paid_orders": paid_orders, "revenue": rev,
        "aov": aov, "customers": customers, "products": products, "low_stock": low_stock,
    }

@api.get("/admin/customers")
async def admin_customers(_: dict = Depends(require_admin)):
    pipeline = [
        {"$match": {"role": "customer"}},
        {"$lookup": {
            "from": "orders",
            "let": {"uid": "$user_id"},
            "pipeline": [
                {"$match": {"$expr": {"$eq": ["$user_id", "$$uid"]}}},
                {"$group": {
                    "_id": None,
                    "order_count": {"$sum": 1},
                    "total_spend": {"$sum": {
                        "$cond": [{"$in": ["$payment_status", ["paid", "cod"]]}, "$total", 0]
                    }},
                }},
            ],
            "as": "stats",
        }},
        {"$addFields": {
            "order_count": {"$ifNull": [{"$arrayElemAt": ["$stats.order_count", 0]}, 0]},
            "total_spend": {"$ifNull": [{"$arrayElemAt": ["$stats.total_spend", 0]}, 0]},
        }},
        {"$project": {"_id": 0, "password_hash": 0, "stats": 0}},
        {"$sort": {"created_at": -1}},
        {"$limit": 1000},
    ]
    return await db.users.aggregate(pipeline).to_list(length=1000)

@api.get("/admin/export/orders.csv")
async def export_orders_csv(_: dict = Depends(require_admin)):
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["order_id", "created_at", "customer_name", "customer_email", "phone",
                     "city", "state", "pincode", "payment_method", "payment_status",
                     "status", "subtotal", "shipping", "discount", "total", "items"])
    cur = db.orders.find({}, {"_id": 0}).sort("created_at", -1)
    async for o in cur:
        addr = o.get("address", {}) or {}
        items_s = "; ".join(f"{i['name']} x{i['qty']}" for i in o.get("items", []))
        writer.writerow([
            o.get("order_id"), o.get("created_at"), addr.get("full_name"),
            o.get("user_email"), addr.get("phone"), addr.get("city"), addr.get("state"),
            addr.get("pincode"), o.get("payment_method"), o.get("payment_status"),
            o.get("status"), o.get("subtotal"), o.get("shipping"), o.get("discount"),
            o.get("total"), items_s,
        ])
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": f'attachment; filename="orders-{now_utc().date()}.csv"'})

app.include_router(api)

# ---------- Root robots/sitemap served from frontend, but also a fallback ----------
@app.get("/robots.txt", include_in_schema=False)
async def robots():
    return PlainTextResponse("User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n")

# ---------------- Startup: indexes + seed ----------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.products.create_index("product_id", unique=True)
    await db.products.create_index("category")
    await db.orders.create_index("order_id", unique=True)
    await db.orders.create_index("user_id")
    await db.orders.create_index("razorpay_order_id")
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)

    admin = await db.users.find_one({"email": ADMIN_EMAIL.lower()})
    if not admin:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}", "name": "Admin",
            "email": ADMIN_EMAIL.lower(), "password_hash": hash_password(ADMIN_PASSWORD),
            "role": "admin", "auth_provider": "password", "created_at": now_utc(),
        })
    else:
        if not verify_password(ADMIN_PASSWORD, admin.get("password_hash", "")):
            await db.users.update_one(
                {"email": ADMIN_EMAIL.lower()},
                {"$set": {"password_hash": hash_password(ADMIN_PASSWORD), "role": "admin"}},
            )

    test_email = "test@pujabazar.in"
    if not await db.users.find_one({"email": test_email}):
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}", "name": "Test User",
            "email": test_email, "password_hash": hash_password("Test@12345"),
            "role": "customer", "auth_provider": "password", "created_at": now_utc(),
        })

    if await db.products.count_documents({}) == 0:
        seed = [
            {"name": "Pure Ganga Jal", "price": 399, "mrp": 599, "image": "/images/ganga-jal.jpg",
             "category": "Ganga Jal", "description": "Authentic Ganga Jal sourced from Haridwar. Sealed for purity.", "stock": 200, "featured": True},
            {"name": "Brass Puja Thali Set", "price": 699, "mrp": 999, "image": "/images/puja-Thali.jpg",
             "category": "Puja Samagri", "description": "Complete brass puja thali — bell, diya, kumkum bowl, agarbatti stand.", "stock": 80, "featured": True},
            {"name": "Sandalwood Incense Sticks", "price": 149, "mrp": 199, "image": "/images/incense-stick.jpg",
             "category": "Puja Samagri", "description": "Hand-rolled sandalwood agarbatti — pack of 100.", "stock": 300, "featured": True},
            {"name": "Premium Brass Diya", "price": 299, "mrp": 449, "image": "/images/Diya-brass.jpg",
             "category": "Decorative", "description": "Hand-finished brass diya — heirloom quality.", "stock": 120, "featured": True},
            {"name": "Authentic Rudraksha Mala (108 beads)", "price": 499, "mrp": 799, "image": "/images/Rudra.jpg",
             "category": "Murti", "description": "Five-mukhi Rudraksha mala for daily japa.", "stock": 90, "featured": True},
            {"name": "Sandalwood Dhoop Cones", "price": 199, "mrp": 299, "image": "https://images.unsplash.com/photo-1541795083-1b160cf4f3d7?crop=entropy&cs=srgb&fm=jpg&q=85",
             "category": "Puja Samagri", "description": "Pure sandalwood dhoop cones — 30 pack.", "stock": 200, "featured": False},
            {"name": "Brass Ganesha Murti", "price": 1299, "mrp": 1999, "image": "/images/hero3.jpg",
             "category": "Murti", "description": "Hand-cast brass Ganesha — 6 inch.", "stock": 40, "featured": False},
            {"name": "Marigold Toran (Door Hanging)", "price": 349, "mrp": 549, "image": "/images/hero5.jpg",
             "category": "Decorative", "description": "Festive marigold toran for entrance — auspicious decor.", "stock": 150, "featured": False},
        ]
        for s in seed:
            s["product_id"] = f"prod_{uuid.uuid4().hex[:10]}"
            s["created_at"] = now_utc()
        await db.products.insert_many(seed)
