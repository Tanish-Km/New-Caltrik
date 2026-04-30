"""Calorie Tracker Backend API tests - pytest based."""
import os
import uuid
import pytest
import requests
from datetime import datetime, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback: read from frontend .env
    try:
        with open("/app/frontend/.env") as f:
            for ln in f:
                if ln.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = ln.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass

API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@calorie.app"
ADMIN_PW = "Admin@123"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def session():
    return requests.Session()


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    return data["token"]


@pytest.fixture(scope="session")
def new_user(session):
    """Register a fresh TEST_ user for isolated CRUD testing."""
    email = f"test_{uuid.uuid4().hex[:8]}@demo.app"
    pw = "Test@12345"
    r = session.post(f"{API}/auth/register", json={"email": email, "password": pw, "name": "TEST User"})
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    data = r.json()
    return {"email": email, "password": pw, "token": data["token"], "user": data["user"], "set_cookie": r.headers.get("set-cookie", "")}


def auth_hdr(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Auth ----------
class TestAuth:
    def test_register_returns_token_and_sets_cookie(self, new_user):
        assert new_user["token"]
        assert new_user["user"]["email"] == new_user["email"]
        assert "access_token" in new_user["set_cookie"].lower()

    def test_login_existing(self, session, new_user):
        r = session.post(f"{API}/auth/login", json={"email": new_user["email"], "password": new_user["password"]})
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["email"] == new_user["email"]
        assert d["token"]

    def test_login_invalid(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrongpass"})
        assert r.status_code == 401

    def test_me_with_bearer(self, session, new_user):
        r = session.get(f"{API}/auth/me", headers=auth_hdr(new_user["token"]))
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["email"] == new_user["email"]
        assert "targets" in d
        assert "target_calories" in d["targets"]

    def test_me_without_token_401(self):
        # Use a fresh session to ensure no cookie auth is used
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_logout_clears_cookie(self, session):
        r = session.post(f"{API}/auth/logout")
        assert r.status_code == 200

    def test_duplicate_register(self, session, new_user):
        r = session.post(f"{API}/auth/register", json={"email": new_user["email"], "password": "whatever", "name": "dup"})
        assert r.status_code == 400


# ---------- Profile ----------
class TestProfile:
    def test_update_profile_recalculates_targets(self, session, new_user):
        token = new_user["token"]
        payload = {"age": 28, "gender": "male", "height_cm": 178, "weight_kg": 80,
                   "activity_level": "moderate", "goal": "fat_loss"}
        r = session.put(f"{API}/profile", json=payload, headers=auth_hdr(token))
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["weight_kg"] == 80
        assert d["user"]["goal"] == "fat_loss"
        t = d["targets"]
        # Mifflin male BMR=10*80+6.25*178-5*28+5 = 800+1112.5-140+5 = 1777.5 -> TDEE *1.55 =~ 2755 -> -500 =~ 2255
        assert 2200 <= t["target_calories"] <= 2310
        assert t["target_protein"] == round(80 * 2.0)

    def test_profile_unauth(self, session):
        r = session.put(f"{API}/profile", json={"age": 30})
        assert r.status_code == 401


# ---------- Foods ----------
class TestFoods:
    def test_search_roti(self, session, new_user):
        r = session.get(f"{API}/foods/search", params={"q": "roti"}, headers=auth_hdr(new_user["token"]))
        assert r.status_code == 200
        data = r.json()
        assert "foods" in data
        assert any("roti" in f["name"].lower() for f in data["foods"])

    def test_search_chicken(self, session, new_user):
        r = session.get(f"{API}/foods/search", params={"q": "chicken"}, headers=auth_hdr(new_user["token"]))
        assert r.status_code == 200
        assert any("chicken" in f["name"].lower() for f in r.json()["foods"])

    def test_search_empty_returns_up_to_30(self, session, new_user):
        r = session.get(f"{API}/foods/search", params={"q": ""}, headers=auth_hdr(new_user["token"]))
        assert r.status_code == 200
        assert len(r.json()["foods"]) <= 30
        assert len(r.json()["foods"]) > 0

    def test_custom_food_create_and_search(self, session, new_user):
        tk = new_user["token"]
        payload = {"name": "TEST_Proteinshake", "serving": "1 cup", "calories": 200, "protein": 30, "carbs": 10, "fats": 3}
        r = session.post(f"{API}/foods/custom", json=payload, headers=auth_hdr(tk))
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Proteinshake"
        r2 = session.get(f"{API}/foods/search", params={"q": "TEST_Proteinshake"}, headers=auth_hdr(tk))
        assert any(c["name"] == "TEST_Proteinshake" for c in r2.json().get("custom", []))


# ---------- Meals ----------
class TestMeals:
    def test_log_and_get_meal(self, session, new_user):
        tk = new_user["token"]
        meal = {"name": "TEST_Meal1", "category": "breakfast", "calories": 300,
                "protein": 20, "carbs": 30, "fats": 10, "servings": 1, "serving": "1 plate"}
        r = session.post(f"{API}/meals", json=meal, headers=auth_hdr(tk))
        assert r.status_code == 200, r.text
        mid = r.json()["id"]
        r2 = session.get(f"{API}/meals", headers=auth_hdr(tk))
        assert r2.status_code == 200
        assert any(m["id"] == mid for m in r2.json()["meals"])

    def test_meal_with_date(self, session, new_user):
        tk = new_user["token"]
        d = "2025-11-01"
        meal = {"name": "TEST_MealPast", "category": "lunch", "calories": 500, "date": d}
        r = session.post(f"{API}/meals", json=meal, headers=auth_hdr(tk))
        assert r.status_code == 200
        mid = r.json()["id"]
        r2 = session.get(f"{API}/meals", params={"date": d}, headers=auth_hdr(tk))
        assert any(m["id"] == mid for m in r2.json()["meals"])

    def test_meal_history(self, session, new_user):
        r = session.get(f"{API}/meals/history", headers=auth_hdr(new_user["token"]))
        assert r.status_code == 200
        meals = r.json()["meals"]
        if len(meals) >= 2:
            # desc by created_at
            assert meals[0].get("created_at", "") >= meals[-1].get("created_at", "")

    def test_delete_meal(self, session, new_user):
        tk = new_user["token"]
        r = session.post(f"{API}/meals", json={"name": "TEST_Del", "category": "snacks", "calories": 100}, headers=auth_hdr(tk))
        mid = r.json()["id"]
        rd = session.delete(f"{API}/meals/{mid}", headers=auth_hdr(tk))
        assert rd.status_code == 200
        r2 = session.get(f"{API}/meals", headers=auth_hdr(tk))
        assert not any(m["id"] == mid for m in r2.json()["meals"])

    def test_meals_unauth(self, session):
        assert session.get(f"{API}/meals").status_code == 401


# ---------- Water ----------
class TestWater:
    def test_upsert_and_get_water(self, session, new_user):
        tk = new_user["token"]
        r = session.post(f"{API}/water", json={"glasses": 5}, headers=auth_hdr(tk))
        assert r.status_code == 200
        r2 = session.get(f"{API}/water", headers=auth_hdr(tk))
        assert r2.json()["glasses"] == 5
        # Upsert update
        session.post(f"{API}/water", json={"glasses": 7}, headers=auth_hdr(tk))
        r3 = session.get(f"{API}/water", headers=auth_hdr(tk))
        assert r3.json()["glasses"] == 7


# ---------- Progress ----------
class TestProgress:
    def test_log_progress_syncs_weight(self, session, new_user):
        tk = new_user["token"]
        r = session.post(f"{API}/progress", json={"weight_kg": 77.5, "waist_cm": 82}, headers=auth_hdr(tk))
        assert r.status_code == 200
        me = session.get(f"{API}/auth/me", headers=auth_hdr(tk)).json()
        assert me["user"]["weight_kg"] == 77.5

    def test_progress_list_ascending(self, session, new_user):
        tk = new_user["token"]
        session.post(f"{API}/progress", json={"weight_kg": 78, "date": "2025-10-01"}, headers=auth_hdr(tk))
        session.post(f"{API}/progress", json={"weight_kg": 77, "date": "2025-12-01"}, headers=auth_hdr(tk))
        r = session.get(f"{API}/progress", headers=auth_hdr(tk))
        entries = r.json()["entries"]
        dates = [e["date"] for e in entries]
        assert dates == sorted(dates)


# ---------- Workouts ----------
class TestWorkouts:
    def test_log_workout_auto_calories(self, session, new_user):
        tk = new_user["token"]
        r = session.post(f"{API}/workouts", json={"exercise": "Bench Press", "sets": 4, "reps": 10, "weight_kg": 60},
                          headers=auth_hdr(tk))
        assert r.status_code == 200
        d = r.json()
        # auto: 4*10*0.15 = 6
        assert d["calories_burned"] >= 1

    def test_log_workout_explicit_calories(self, session, new_user):
        tk = new_user["token"]
        r = session.post(f"{API}/workouts", json={"exercise": "Run", "duration_min": 30, "calories_burned": 300},
                          headers=auth_hdr(tk))
        assert r.status_code == 200
        assert r.json()["calories_burned"] == 300

    def test_get_workouts_with_date(self, session, new_user):
        tk = new_user["token"]
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        r = session.get(f"{API}/workouts", params={"date": today}, headers=auth_hdr(tk))
        assert r.status_code == 200
        assert "workouts" in r.json()


# ---------- Dashboard ----------
class TestDashboard:
    def test_dashboard_shape(self, session, new_user):
        tk = new_user["token"]
        r = session.get(f"{API}/dashboard", headers=auth_hdr(tk))
        assert r.status_code == 200
        d = r.json()
        for k in ["date", "targets", "consumed", "burned", "remaining",
                  "by_category", "water_glasses", "meals_count", "workouts_count"]:
            assert k in d
        assert "suggestion" in d
        assert set(d["by_category"].keys()) == {"breakfast", "lunch", "dinner", "snacks"}

    def test_dashboard_unauth(self, session):
        assert session.get(f"{API}/dashboard").status_code == 401
