from dotenv import load_dotenv
load_dotenv()

import os
import uuid
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List

import bcrypt
import jwt
import httpx
from fastapi import FastAPI, HTTPException, Request, Response, Depends, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from motor.motor_asyncio import AsyncIOMotorClient

# Optional Razorpay
try:
    import razorpay
except Exception:
    razorpay = None

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
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": now_utc() + timedelta(days=7),
        "iat": now_utc(),
        "type": "access",
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
    # 1. JWT cookie / Bearer
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
    # 2. Emergent session_token cookie
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

# ---------------- Models ----------------
class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=80)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ProductIn(BaseModel):
    name: str
    price: int
    mrp: Optional[int] = None
    image: str
    category: str
    description: Optional[str] = ""
    stock: int = 100
    featured: bool = False

class AddressIn(BaseModel):
    full_name: str
    phone: str
    line1: str
    line2: Optional[str] = ""
    city: str
    state: str
    pincode: str

class CartItemIn(BaseModel):
    product_id: str
    qty: int = 1

class CheckoutIn(BaseModel):
    items: List[CartItemIn]
    address: AddressIn
    payment_method: str  # "razorpay" | "cod"

class VerifyPaymentIn(BaseModel):
    order_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class OrderStatusIn(BaseModel):
    status: str  # "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"

# ---------------- App ----------------
app = FastAPI(title="PujaBazar API")
api = APIRouter(prefix="/api")

origins = [FRONTEND_URL, "http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Health ----------
@api.get("/")
async def root():
    return {"ok": True, "service": "pujabazar"}

@api.get("/config")
async def public_config():
    return {"razorpay_key_id": RAZORPAY_KEY_ID or None}

# ---------- Auth: JWT ----------
@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "name": payload.name.strip(),
        "email": email,
        "password_hash": hash_password(payload.password),
        "role": "customer",
        "auth_provider": "password",
        "created_at": now_utc(),
    }
    await db.users.insert_one(user_doc)
    token = create_jwt(user_id, email, "customer")
    set_auth_cookie(response, token)
    return {"user_id": user_id, "name": user_doc["name"], "email": email, "role": "customer", "token": token}

@api.post("/auth/login")
async def login(payload: LoginIn, response: Response):
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
    # Best-effort: clear both cookies
    clear_auth_cookies(response)
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    user.pop("password_hash", None)
    return user

# ---------- Auth: Emergent Google ----------
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
async def list_products(category: Optional[str] = None, q: Optional[str] = None, featured: Optional[bool] = None):
    query = {}
    if category:
        query["category"] = category
    if featured is not None:
        query["featured"] = featured
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    cursor = db.products.find(query, {"_id": 0}).sort("created_at", -1)
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
    p = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    return p

@api.delete("/products/{product_id}")
async def delete_product(product_id: str, _: dict = Depends(require_admin)):
    res = await db.products.delete_one({"product_id": product_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}

# ---------- Orders ----------
async def _compute_order(items_in: List[CartItemIn]):
    items = []
    subtotal = 0
    for ci in items_in:
        if ci.qty <= 0:
            continue
        p = await db.products.find_one({"product_id": ci.product_id}, {"_id": 0})
        if not p:
            raise HTTPException(status_code=400, detail=f"Invalid product: {ci.product_id}")
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

@api.post("/checkout")
async def checkout(payload: CheckoutIn, user: dict = Depends(get_current_user)):
    items, subtotal, shipping, total = await _compute_order(payload.items)
    discount = 0
    if payload.payment_method == "razorpay":
        # 5% prepaid discount as advertised
        discount = round(total * 0.05)
    final_total = total - discount

    order_id = f"ord_{uuid.uuid4().hex[:12]}"
    order_doc = {
        "order_id": order_id,
        "user_id": user["user_id"],
        "items": items,
        "address": payload.address.model_dump(),
        "payment_method": payload.payment_method,
        "subtotal": subtotal,
        "shipping": shipping,
        "discount": discount,
        "total": final_total,
        "status": "pending",
        "payment_status": "pending",
        "razorpay_order_id": None,
        "created_at": now_utc(),
    }

    if payload.payment_method == "razorpay":
        if not razorpay_client:
            # Allow placing order in dev without keys (mark as test prepaid)
            order_doc["payment_status"] = "test_mode"
            await db.orders.insert_one(order_doc)
            order_doc.pop("_id", None)
            return {"order": order_doc, "razorpay": None, "mock": True}
        rp = razorpay_client.order.create({
            "amount": final_total * 100,  # paise
            "currency": "INR",
            "receipt": order_id[:40],
            "payment_capture": 1,
            "notes": {"order_id": order_id, "user_id": user["user_id"]},
        })
        order_doc["razorpay_order_id"] = rp["id"]
        await db.orders.insert_one(order_doc)
        order_doc.pop("_id", None)
        return {
            "order": order_doc,
            "razorpay": {
                "key_id": RAZORPAY_KEY_ID,
                "order_id": rp["id"],
                "amount": rp["amount"],
                "currency": rp["currency"],
            },
        }
    else:
        order_doc["status"] = "confirmed"
        order_doc["payment_status"] = "cod"
        await db.orders.insert_one(order_doc)
        order_doc.pop("_id", None)
        return {"order": order_doc, "razorpay": None}

@api.post("/payments/verify")
async def verify_payment(payload: VerifyPaymentIn, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"order_id": payload.order_id, "user_id": user["user_id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not razorpay_client:
        # dev: accept blindly
        await db.orders.update_one(
            {"order_id": payload.order_id},
            {"$set": {"status": "confirmed", "payment_status": "paid",
                      "razorpay_payment_id": payload.razorpay_payment_id}},
        )
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
    return {"ok": True}

@api.get("/orders")
async def my_orders(user: dict = Depends(get_current_user)):
    cur = db.orders.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1)
    return await cur.to_list(length=200)

@api.get("/admin/orders")
async def admin_orders(_: dict = Depends(require_admin)):
    cur = db.orders.find({}, {"_id": 0}).sort("created_at", -1)
    return await cur.to_list(length=500)

@api.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, payload: OrderStatusIn, _: dict = Depends(require_admin)):
    res = await db.orders.update_one({"order_id": order_id}, {"$set": {"status": payload.status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"ok": True}

@api.get("/admin/stats")
async def admin_stats(_: dict = Depends(require_admin)):
    total_orders = await db.orders.count_documents({})
    paid_orders = await db.orders.count_documents({"payment_status": {"$in": ["paid", "cod"]}})
    revenue_pipe = [
        {"$match": {"payment_status": {"$in": ["paid", "cod"]}}},
        {"$group": {"_id": None, "rev": {"$sum": "$total"}}},
    ]
    rev = 0
    async for r in db.orders.aggregate(revenue_pipe):
        rev = r.get("rev", 0)
    customers = await db.users.count_documents({"role": "customer"})
    products = await db.products.count_documents({})
    aov = round(rev / paid_orders) if paid_orders else 0
    return {
        "total_orders": total_orders, "paid_orders": paid_orders,
        "revenue": rev, "aov": aov, "customers": customers, "products": products,
    }

app.include_router(api)

# ---------------- Startup: indexes + seed ----------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.products.create_index("product_id", unique=True)
    await db.products.create_index("category")
    await db.orders.create_index("order_id", unique=True)
    await db.orders.create_index("user_id")
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)

    # Admin seed
    admin = await db.users.find_one({"email": ADMIN_EMAIL.lower()})
    if not admin:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "name": "Admin",
            "email": ADMIN_EMAIL.lower(),
            "password_hash": hash_password(ADMIN_PASSWORD),
            "role": "admin",
            "auth_provider": "password",
            "created_at": now_utc(),
        })
    else:
        if not verify_password(ADMIN_PASSWORD, admin.get("password_hash", "")):
            await db.users.update_one(
                {"email": ADMIN_EMAIL.lower()},
                {"$set": {"password_hash": hash_password(ADMIN_PASSWORD), "role": "admin"}},
            )

    # Seed test customer
    test_email = "test@pujabazar.in"
    if not await db.users.find_one({"email": test_email}):
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "name": "Test User",
            "email": test_email,
            "password_hash": hash_password("Test@12345"),
            "role": "customer",
            "auth_provider": "password",
            "created_at": now_utc(),
        })

    # Seed products
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
            {"name": "Brass Ganesha Murti", "price": 1299, "mrp": 1999, "image": "https://customer-assets.emergentagent.com/job_07b6612e-c1bd-4caa-b48c-faa0ca811820/artifacts/images/hero3.jpg",
             "category": "Murti", "description": "Hand-cast brass Ganesha — 6 inch.", "stock": 40, "featured": False},
            {"name": "Marigold Toran (Door Hanging)", "price": 349, "mrp": 549, "image": "https://customer-assets.emergentagent.com/job_07b6612e-c1bd-4caa-b48c-faa0ca811820/artifacts/images/hero5.jpg",
             "category": "Decorative", "description": "Festive marigold toran for entrance — auspicious decor.", "stock": 150, "featured": False},
        ]
        for s in seed:
            s["product_id"] = f"prod_{uuid.uuid4().hex[:10]}"
            s["created_at"] = now_utc()
        await db.products.insert_many(seed)
