"""Extended Verification Test Suite for CalTrik:
- Date-based persistence for Meals, Workouts, Water, Progress, Dashboard
- Login session persistence and Bearer vs Cookie authentication
- User data isolation between accounts
- Vercel CORS compatibility (Origin reflection + Allow-Credentials)
"""
import pytest
import requests
import uuid

API = "http://127.0.0.1:8001/api"

def create_user():
    email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    pw = "Pass@12345"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": pw, "name": "Test Runner"})
    assert r.status_code == 200, f"Register failed: {r.text}"
    data = r.json()
    return {"email": email, "password": pw, "token": data["token"], "user": data["user"]}

def test_health_endpoint():
    r = requests.get(f"{API}/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"

def test_vercel_cors_compatibility():
    # Test preflight OPTIONS with Vercel origin
    headers = {
        "Origin": "https://caltrik-prod.vercel.app",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Authorization,Content-Type",
    }
    r = requests.options(f"{API}/auth/login", headers=headers)
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == "https://caltrik-prod.vercel.app"
    assert r.headers.get("access-control-allow-credentials") == "true"

def test_login_session_bearer_and_cookie():
    user = create_user()
    token = user["token"]

    # 1. Bearer header authentication
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["user"]["email"] == user["email"]

    # 2. Cookie authentication
    r = requests.get(f"{API}/auth/me", cookies={"access_token": token})
    assert r.status_code == 200
    assert r.json()["user"]["email"] == user["email"]

    # 3. Invalid token returns 401
    r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer invalid_token"})
    assert r.status_code == 401

def test_date_based_meals_and_isolation():
    u1 = create_user()
    u2 = create_user()
    h1 = {"Authorization": f"Bearer {u1['token']}"}
    h2 = {"Authorization": f"Bearer {u2['token']}"}

    date1 = "2026-10-15"
    date2 = "2026-10-16"

    # User 1 logs meals on two distinct dates
    r = requests.post(f"{API}/meals", headers=h1, json={
        "name": "Oatmeal Bowl", "category": "breakfast", "calories": 350,
        "protein": 15, "carbs": 55, "fats": 7, "date": date1
    })
    assert r.status_code == 200

    r = requests.post(f"{API}/meals", headers=h1, json={
        "name": "Grilled Chicken Salad", "category": "lunch", "calories": 480,
        "protein": 42, "carbs": 12, "fats": 18, "date": date2
    })
    assert r.status_code == 200

    # User 2 logs a meal on date1
    r = requests.post(f"{API}/meals", headers=h2, json={
        "name": "Protein Shake", "category": "snacks", "calories": 200,
        "protein": 30, "carbs": 5, "fats": 2, "date": date1
    })
    assert r.status_code == 200

    # Verify User 1 queries date1: should have Oatmeal, NOT Chicken, and NOT User 2's Shake
    r1_d1 = requests.get(f"{API}/meals", headers=h1, params={"date": date1}).json()
    assert len(r1_d1["meals"]) == 1
    assert r1_d1["meals"][0]["name"] == "Oatmeal Bowl"

    # Verify User 1 queries date2: should have Chicken, NOT Oatmeal
    r1_d2 = requests.get(f"{API}/meals", headers=h1, params={"date": date2}).json()
    assert len(r1_d2["meals"]) == 1
    assert r1_d2["meals"][0]["name"] == "Grilled Chicken Salad"

    # Verify User 2 queries date1: only has Protein Shake
    r2_d1 = requests.get(f"{API}/meals", headers=h2, params={"date": date1}).json()
    assert len(r2_d1["meals"]) == 1
    assert r2_d1["meals"][0]["name"] == "Protein Shake"

def test_date_based_water_and_workouts():
    u = create_user()
    h = {"Authorization": f"Bearer {u['token']}"}

    date_a = "2026-10-18"
    date_b = "2026-10-19"

    # Log water for date_a (6 glasses) and date_b (9 glasses)
    requests.post(f"{API}/water", headers=h, json={"glasses": 6, "date": date_a})
    requests.post(f"{API}/water", headers=h, json={"glasses": 9, "date": date_b})

    # Log workout for date_a
    requests.post(f"{API}/workouts", headers=h, json={
        "exercise": "Bench Press", "sets": 4, "reps": 8, "weight_kg": 80, "duration_min": 45, "date": date_a
    })

    # Verify water per date
    assert requests.get(f"{API}/water", headers=h, params={"date": date_a}).json()["glasses"] == 6
    assert requests.get(f"{API}/water", headers=h, params={"date": date_b}).json()["glasses"] == 9

    # Verify workouts per date
    w_a = requests.get(f"{API}/workouts", headers=h, params={"date": date_a}).json()["workouts"]
    w_b = requests.get(f"{API}/workouts", headers=h, params={"date": date_b}).json()["workouts"]
    assert len(w_a) == 1
    assert w_a[0]["exercise"] == "Bench Press"
    assert len(w_b) == 0

def test_date_based_dashboard_aggregation():
    u = create_user()
    h = {"Authorization": f"Bearer {u['token']}"}
    test_date = "2026-10-22"

    # Log meals on test_date
    requests.post(f"{API}/meals", headers=h, json={
        "name": "Eggs & Toast", "category": "breakfast", "calories": 400, "protein": 24, "carbs": 30, "fats": 14, "date": test_date
    })
    requests.post(f"{API}/meals", headers=h, json={
        "name": "Salmon Rice", "category": "dinner", "calories": 600, "protein": 45, "carbs": 50, "fats": 20, "date": test_date
    })

    # Log workout on test_date (explicit calories_burned = 350)
    requests.post(f"{API}/workouts", headers=h, json={
        "exercise": "Deadlift", "sets": 5, "reps": 5, "weight_kg": 120, "calories_burned": 350, "date": test_date
    })

    # Log water on test_date
    requests.post(f"{API}/water", headers=h, json={"glasses": 7, "date": test_date})

    # Fetch dashboard for test_date
    dash = requests.get(f"{API}/dashboard", headers=h, params={"date": test_date}).json()
    assert dash["date"] == test_date
    assert dash["consumed"]["calories"] == 1000
    assert dash["consumed"]["protein"] == 69
    assert dash["consumed"]["carbs"] == 80
    assert dash["consumed"]["fats"] == 34
    assert dash["burned"] == 350
    assert dash["water_glasses"] == 7
    assert dash["meals_count"] == 2
    assert dash["workouts_count"] == 1
    assert dash["by_category"]["breakfast"] == 400
    assert dash["by_category"]["dinner"] == 600

    # Fetch dashboard for a different empty date
    empty_dash = requests.get(f"{API}/dashboard", headers=h, params={"date": "2026-10-23"}).json()
    assert empty_dash["date"] == "2026-10-23"
    assert empty_dash["consumed"]["calories"] == 0
    assert empty_dash["burned"] == 0
    assert empty_dash["water_glasses"] == 0
    assert empty_dash["meals_count"] == 0
