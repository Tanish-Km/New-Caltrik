from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

from foods_data import FOODS

# ---------- Setup ----------
mongo_url = os.environ.get('MONGO_URL', 'mongodb://127.0.0.1:27017')
client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
db_name = os.environ.get('DB_NAME', 'caltrik')
db = client[db_name]

JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ.get("JWT_SECRET", "caltrik_super_secure_jwt_secret_key_2026")

app = FastAPI(title="Calorie Tracker API", redirect_slashes=False)
api = APIRouter()

# ---------- Auth Helpers ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def set_auth_cookie(response: Response, token: str, request: Optional[Request] = None):
    is_secure = False
    if request:
        proto = request.headers.get("x-forwarded-proto", "")
        is_secure = request.url.is_secure or proto.lower() == "https"
    elif os.environ.get("ENVIRONMENT", "").lower() in ("production", "prod"):
        is_secure = True

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=is_secure,
        samesite="none" if is_secure else "lax",
        max_age=604800,
        path="/"
    )

async def get_current_user(request: Request) -> dict:
    tokens_to_try = []
    
    # 1. Bearer token in Authorization header (primary for SPAs & cross-domain Vercel deployments)
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        bearer_token = auth_header[7:].strip()
        if bearer_token:
            tokens_to_try.append(bearer_token)
            
    # 2. Cookie access_token
    cookie_token = request.cookies.get("access_token")
    if cookie_token and cookie_token not in tokens_to_try:
        tokens_to_try.append(cookie_token)
        
    if not tokens_to_try:
        raise HTTPException(status_code=401, detail="Not authenticated")

    secret = get_jwt_secret()
    last_error = "Invalid token"

    for tok in tokens_to_try:
        try:
            payload = jwt.decode(tok, secret, algorithms=[JWT_ALGORITHM])
            user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
            if user:
                return user
            last_error = "User not found"
        except jwt.ExpiredSignatureError:
            last_error = "Token expired"
        except jwt.InvalidTokenError:
            last_error = "Invalid token"
        except Exception as e:
            last_error = str(e)

    raise HTTPException(status_code=401, detail=last_error)

# ---------- Calorie / Macro calculator ----------
ACTIVITY_MULT = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "very_active": 1.9,
}

def calculate_bmr_tdee_macros(profile: dict) -> dict:
    """Mifflin-St Jeor BMR -> TDEE -> adjust for goal -> split macros."""
    age = profile.get("age") or 25
    weight = profile.get("weight_kg") or 70
    height = profile.get("height_cm") or 170
    gender = profile.get("gender") or "male"
    activity = profile.get("activity_level") or "moderate"
    goal = profile.get("goal") or "maintenance"

    if gender == "male":
        bmr = 10 * weight + 6.25 * height - 5 * age + 5
    else:
        bmr = 10 * weight + 6.25 * height - 5 * age - 161

    tdee = bmr * ACTIVITY_MULT.get(activity, 1.55)

    if goal == "fat_loss":
        target = tdee - 500
        protein_g = weight * 2.0
        fat_g = weight * 0.8
    elif goal == "muscle_gain":
        target = tdee + 300
        protein_g = weight * 2.2
        fat_g = weight * 0.9
    else:
        target = tdee
        protein_g = weight * 1.8
        fat_g = weight * 1.0

    protein_cal = protein_g * 4
    fat_cal = fat_g * 9
    carb_cal = max(target - protein_cal - fat_cal, 0)
    carbs_g = carb_cal / 4

    return {
        "bmr": round(bmr),
        "tdee": round(tdee),
        "target_calories": round(target),
        "target_protein": round(protein_g),
        "target_carbs": round(carbs_g),
        "target_fats": round(fat_g),
    }

# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[Literal["male", "female"]] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    activity_level: Optional[Literal["sedentary", "light", "moderate", "active", "very_active"]] = None
    goal: Optional[Literal["fat_loss", "muscle_gain", "maintenance"]] = None

class MealIn(BaseModel):
    name: str
    category: Literal["breakfast", "lunch", "dinner", "snacks"]
    calories: float
    protein: float = 0
    carbs: float = 0
    fats: float = 0
    serving: Optional[str] = None
    servings: float = 1
    date: Optional[str] = None  # YYYY-MM-DD

class MealUpdate(BaseModel):
    servings: Optional[float] = None
    name: Optional[str] = None
    category: Optional[Literal["breakfast", "lunch", "dinner", "snacks"]] = None
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fats: Optional[float] = None
    serving: Optional[str] = None

class WaterIn(BaseModel):
    glasses: int
    date: Optional[str] = None

class ProgressIn(BaseModel):
    weight_kg: Optional[float] = None
    waist_cm: Optional[float] = None
    chest_cm: Optional[float] = None
    hips_cm: Optional[float] = None
    arms_cm: Optional[float] = None
    date: Optional[str] = None

class WorkoutIn(BaseModel):
    exercise: str
    sets: int = 1
    reps: int = 0
    weight_kg: float = 0
    duration_min: Optional[float] = 0
    calories_burned: Optional[float] = 0
    date: Optional[str] = None

class CustomFoodIn(BaseModel):
    name: str
    serving: str
    calories: float
    protein: float = 0
    carbs: float = 0
    fats: float = 0

# ---------- helpers ----------
def normalize_date(d: Optional[str] = None) -> str:
    if d and isinstance(d, str):
        cleaned = d.strip()[:10]
        if len(cleaned) == 10 and cleaned[4] == '-' and cleaned[7] == '-':
            return cleaned
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")

def today_str() -> str:
    return normalize_date()

def new_id() -> str:
    return str(uuid.uuid4())

# ---------- Auth routes ----------
@api.post("/auth/register")
@api.post("/auth/register/", include_in_schema=False)
async def register(body: RegisterIn, response: Response, request: Request):
    email = body.email.lower().strip()
    try:
        if await db.users.find_one({"email": email}):
            raise HTTPException(status_code=400, detail="Email already registered")
        uid = new_id()
        user_doc = {
            "id": uid,
            "email": email,
            "name": body.name.strip(),
            "password_hash": hash_password(body.password),
            "role": "user",
            "age": None, "gender": None, "height_cm": None, "weight_kg": None,
            "activity_level": "moderate", "goal": "maintenance",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user_doc)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database error during register: {e}")
        raise HTTPException(status_code=503, detail="Database connection unavailable. Please ensure MONGO_URL is configured in your environment variables.")
    token = create_access_token(uid, email)
    set_auth_cookie(response, token, request)
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    return {"user": user_doc, "token": token}

@api.post("/auth/login")
@api.post("/auth/login/", include_in_schema=False)
async def login(body: LoginIn, response: Response, request: Request):
    email = body.email.lower().strip()
    try:
        user = await db.users.find_one({"email": email})
    except Exception as e:
        logger.error(f"Database error during login: {e}")
        raise HTTPException(status_code=503, detail="Database connection unavailable. Please ensure MONGO_URL is configured in your environment variables.")
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], email)
    set_auth_cookie(response, token, request)
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"user": user, "token": token}

@api.post("/auth/logout")
@api.post("/auth/logout/", include_in_schema=False)
async def logout(response: Response, request: Request):
    is_secure = request.url.is_secure or request.headers.get("x-forwarded-proto", "").lower() == "https"
    response.delete_cookie("access_token", path="/", samesite="none" if is_secure else "lax", secure=is_secure)
    return {"ok": True}

@api.get("/auth/me")
@api.get("/auth/me/", include_in_schema=False)
async def me(user: dict = Depends(get_current_user)):
    targets = calculate_bmr_tdee_macros(user)
    return {"user": user, "targets": targets}

# ---------- Profile ----------
@api.put("/profile")
async def update_profile(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    targets = calculate_bmr_tdee_macros(updated)
    return {"user": updated, "targets": targets}

# ---------- Foods ----------
@api.get("/foods/search")
async def search_foods(q: str = Query("", max_length=100), user: dict = Depends(get_current_user)):
    ql = q.lower().strip()
    results = [f for f in FOODS if ql in f["name"].lower()] if ql else FOODS[:30]
    # also include user custom foods
    customs = await db.custom_foods.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    if ql:
        customs = [c for c in customs if ql in c["name"].lower()]
    return {"foods": results[:50], "custom": customs}

@api.post("/foods/custom")
async def add_custom_food(body: CustomFoodIn, user: dict = Depends(get_current_user)):
    doc = {"id": new_id(), "user_id": user["id"], **body.model_dump(), "is_custom": True, "cuisine": "custom"}
    await db.custom_foods.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.delete("/foods/custom/{food_id}")
async def delete_custom_food(food_id: str, user: dict = Depends(get_current_user)):
    await db.custom_foods.delete_one({"id": food_id, "user_id": user["id"]})
    return {"ok": True}

# ---------- Meals ----------
@api.post("/meals")
async def log_meal(body: MealIn, user: dict = Depends(get_current_user)):
    d = normalize_date(body.date)
    doc = {
        "id": new_id(), "user_id": user["id"], "date": d,
        **body.model_dump(exclude={"date"}),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.meals.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/meals")
async def get_meals(date: Optional[str] = None, user: dict = Depends(get_current_user)):
    d = normalize_date(date)
    meals = await db.meals.find({"user_id": user["id"], "date": d}, {"_id": 0}).to_list(500)
    meals.sort(key=lambda m: m.get("created_at", ""))
    return {"date": d, "meals": meals}

@api.delete("/meals/{meal_id}")
async def delete_meal(meal_id: str, user: dict = Depends(get_current_user)):
    await db.meals.delete_one({"id": meal_id, "user_id": user["id"]})
    return {"ok": True}

@api.patch("/meals/{meal_id}")
@api.patch("/meals/{meal_id}/", include_in_schema=False)
@api.put("/meals/{meal_id}")
@api.put("/meals/{meal_id}/", include_in_schema=False)
async def update_meal(meal_id: str, body: MealUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "servings" in updates and updates["servings"] <= 0:
        await db.meals.delete_one({"id": meal_id, "user_id": user["id"]})
        return {"ok": True, "deleted": True}
    res = await db.meals.update_one(
        {"id": meal_id, "user_id": user["id"]},
        {"$set": updates}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Meal not found")
    updated = await db.meals.find_one({"id": meal_id, "user_id": user["id"]}, {"_id": 0})
    return updated

@api.get("/meals/history")
async def meal_history(limit: int = 50, user: dict = Depends(get_current_user)):
    meals = await db.meals.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return {"meals": meals}

# ---------- Water ----------
@api.post("/water")
async def log_water(body: WaterIn, user: dict = Depends(get_current_user)):
    d = normalize_date(body.date)
    glasses = max(0, body.glasses)
    await db.water.update_one(
        {"user_id": user["id"], "date": d},
        {"$set": {"glasses": glasses, "user_id": user["id"], "date": d}},
        upsert=True,
    )
    return {"date": d, "glasses": glasses}

@api.get("/water")
async def get_water(date: Optional[str] = None, user: dict = Depends(get_current_user)):
    d = normalize_date(date)
    rec = await db.water.find_one({"user_id": user["id"], "date": d}, {"_id": 0})
    return {"date": d, "glasses": (rec or {}).get("glasses", 0)}

# ---------- Progress ----------
@api.post("/progress")
async def log_progress(body: ProgressIn, user: dict = Depends(get_current_user)):
    d = normalize_date(body.date)
    doc = {"id": new_id(), "user_id": user["id"], "date": d,
           **{k: v for k, v in body.model_dump(exclude={"date"}).items() if v is not None},
           "created_at": datetime.now(timezone.utc).isoformat()}
    await db.progress.insert_one(doc)
    # sync latest weight to profile
    if body.weight_kg is not None and body.weight_kg > 0:
        await db.users.update_one({"id": user["id"]}, {"$set": {"weight_kg": body.weight_kg}})
    doc.pop("_id", None)
    return doc

@api.get("/progress")
async def list_progress(user: dict = Depends(get_current_user)):
    recs = await db.progress.find({"user_id": user["id"]}, {"_id": 0}).sort("date", 1).to_list(1000)
    return {"entries": recs}

@api.delete("/progress/{entry_id}")
async def delete_progress(entry_id: str, user: dict = Depends(get_current_user)):
    await db.progress.delete_one({"id": entry_id, "user_id": user["id"]})
    return {"ok": True}

# ---------- Workouts ----------
@api.post("/workouts")
async def log_workout(body: WorkoutIn, user: dict = Depends(get_current_user)):
    d = normalize_date(body.date)
    # estimate calories burned if not provided (rough: 0.1 kcal/kg/rep + 5 kcal/min)
    cal = body.calories_burned or 0
    if not cal:
        weight = user.get("weight_kg") or 70
        cal = round(body.sets * body.reps * 0.15 + (body.duration_min or 0) * 6)
    doc = {
        "id": new_id(), "user_id": user["id"], "date": d,
        **body.model_dump(exclude={"date", "calories_burned"}),
        "calories_burned": cal,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.workouts.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/workouts")
async def get_workouts(date: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"user_id": user["id"]}
    if date:
        q["date"] = normalize_date(date)
    recs = await db.workouts.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"workouts": recs}

@api.delete("/workouts/{wid}")
async def delete_workout(wid: str, user: dict = Depends(get_current_user)):
    await db.workouts.delete_one({"id": wid, "user_id": user["id"]})
    return {"ok": True}

# ---------- Dashboard ----------
@api.get("/dashboard")
async def dashboard(date: Optional[str] = None, user: dict = Depends(get_current_user)):
    d = normalize_date(date)
    meals = await db.meals.find({"user_id": user["id"], "date": d}, {"_id": 0}).to_list(500)
    workouts = await db.workouts.find({"user_id": user["id"], "date": d}, {"_id": 0}).to_list(500)
    water = await db.water.find_one({"user_id": user["id"], "date": d}, {"_id": 0})

    consumed = {
        "calories": sum(m["calories"] * m.get("servings", 1) for m in meals),
        "protein": sum(m["protein"] * m.get("servings", 1) for m in meals),
        "carbs": sum(m["carbs"] * m.get("servings", 1) for m in meals),
        "fats": sum(m["fats"] * m.get("servings", 1) for m in meals),
    }
    burned = sum(w.get("calories_burned", 0) for w in workouts)
    targets = calculate_bmr_tdee_macros(user)

    # by category
    by_cat = {"breakfast": 0, "lunch": 0, "dinner": 0, "snacks": 0}
    for m in meals:
        by_cat[m["category"]] = by_cat.get(m["category"], 0) + m["calories"] * m.get("servings", 1)

    # Auto-adjust suggestion
    suggestion = None
    progress = await db.progress.find({"user_id": user["id"]}, {"_id": 0}).sort("date", 1).to_list(1000)
    weights = [p for p in progress if p.get("weight_kg")]
    if len(weights) >= 2:
        first, last = weights[0], weights[-1]
        delta = last["weight_kg"] - first["weight_kg"]
        goal = user.get("goal")
        if goal == "fat_loss" and delta >= -0.3:
            suggestion = "Weight loss is slow. Consider reducing daily calories by ~150 kcal or adding 20 min cardio."
        elif goal == "muscle_gain" and delta <= 0.2:
            suggestion = "Muscle gain is slow. Try increasing calories by ~200 kcal and protein by 15g daily."
        elif goal == "maintenance" and abs(delta) > 1.5:
            suggestion = "Weight has drifted from maintenance. Recalibrate your daily target."

    # low protein warning for today
    if targets["target_protein"] > 0 and consumed["protein"] < targets["target_protein"] * 0.6 and len(meals) >= 2:
        suggestion = suggestion or "Low protein intake today — add a protein-rich snack to hit your target."

    return {
        "date": d,
        "targets": targets,
        "consumed": {k: round(v, 1) for k, v in consumed.items()},
        "burned": round(burned),
        "remaining": round(targets["target_calories"] - consumed["calories"] + burned),
        "by_category": {k: round(v, 1) for k, v in by_cat.items()},
        "water_glasses": (water or {}).get("glasses", 0),
        "water_target": 8,
        "meals_count": len(meals),
        "workouts_count": len(workouts),
        "suggestion": suggestion,
    }

# ---------- Health & Diagnostics ----------
@api.get("/")
async def root():
    return {"message": "Calorie Tracker API", "status": "running"}

@api.get("/health")
@api.get("/health/", include_in_schema=False)
async def health():
    db_status = "connected"
    try:
        await client.admin.command("ping")
    except Exception as e:
        db_status = f"error: {str(e)}"
    return {"status": "ok", "database": db_status}

# Global OPTIONS handler so preflight or direct OPTIONS requests never return 405 Method Not Allowed
@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    return Response(status_code=200)

# Dual-mount the router so both /api/... and /... resolve seamlessly across local dev and Vercel rewrites
app.include_router(api, prefix="/api")
app.include_router(api)

# Configure CORS for local development and Vercel deployments
cors_origins_env = os.environ.get("CORS_ORIGINS", "")
custom_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]

default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8001",
    "http://127.0.0.1:8001",
]
allowed_origins = list(set(default_origins + custom_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def on_startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.meals.create_index([("user_id", 1), ("date", 1)])
        await db.workouts.create_index([("user_id", 1), ("date", 1)])
        await db.progress.create_index([("user_id", 1), ("date", 1)])
    except Exception as e:
        logger.warning(f"Index creation warning: {e}")

    try:
        # Seed admin
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@calorie.app").lower().strip()
        admin_pw = os.environ.get("ADMIN_PASSWORD", "Admin@123")
        existing = await db.users.find_one({"email": admin_email})
        if not existing:
            await db.users.insert_one({
                "id": new_id(), "email": admin_email, "name": "Admin",
                "password_hash": hash_password(admin_pw), "role": "admin",
                "age": 30, "gender": "male", "height_cm": 175, "weight_kg": 75,
                "activity_level": "moderate", "goal": "maintenance",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            logger.info("Admin seeded.")
    except Exception as e:
        logger.warning(f"Admin seeding warning: {e}")

@app.on_event("shutdown")
async def shutdown():
    client.close()
