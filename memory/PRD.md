# Calorie Tracker — PRD

## Original Problem Statement
Build a fully functional, modern, responsive "Calorie Tracker" website using HTML5/CSS3/ES6+ and React.js. Core systems: user accounts, food logging, calorie/macro calculator, daily dashboard, progress tracking, food search DB (Indian + global), meal history, reminders, auto adjustment suggestions, and workout integration. Must feel like a professional fitness product — clean, fast, and accurate.

## User Decisions (2026-04-30)
- Auth: JWT-based custom (email + password)
- Food DB: Curated built-in (Indian + global)
- Theme: Both (Dark default + Light toggle)
- Notifications: In-app toasts (MVP)
- Scope: MVP first; external integrations (USDA/Email) deferred to Phase 2

## Architecture
- Backend: FastAPI + MongoDB (motor async) on port 8001 under `/api`
- Frontend: React 19 + Tailwind + Shadcn UI + Recharts + Sonner
- Auth: JWT (HS256), 7-day access token. Bearer header **and** httpOnly cookie supported.
- Design: "Performance Pro" tactical minimalism — Bebas Neue / Barlow Condensed / Manrope; Volt Yellow (#CCFF00) accent; sharp edges.

## Implemented (2026-04-30)
- Auth: register / login / logout / me with profile defaults
- Profile: age, gender, height, weight, activity, goal → BMR (Mifflin-St Jeor) → TDEE → macro split
- Food DB: 58 curated items (Indian + global) + user custom foods
- Meals: CRUD by category (breakfast/lunch/dinner/snacks), history with "Repeat" action
- Water tracking (upsert by day)
- Progress: weight + waist/chest/hips/arms, line chart trend, sync latest weight to profile
- Workouts: exercise + sets/reps/weight + duration, calorie burn estimator
- Dashboard: consumed vs target calories, macro pie + progress bars, by-category calories, hydration, training output, targets panel, auto-adjust suggestion
- Theme toggle (dark default) persisted in localStorage
- Sonner toasts
- Responsive sidebar (desktop) / tabbed bottom nav (mobile)
- All 26 backend tests passing

## Phase 2 Backlog (P1)
- External food DB integration (USDA/Open Food Facts) for richer search
- Email reminders via Resend for meal logging / hydration
- Browser push notifications
- Forgot password / reset flow
- Rate limiting + brute-force lockout on login
- Export dashboard as PDF / CSV
- Share progress photos + visual comparison
- Barcode/image food scanner (Gemini vision)

## Phase 3 (P2)
- Social layer (friends, leaderboards)
- Premium tier (Stripe) — advanced analytics, AI meal planner
- Mobile app wrapper (PWA install already possible)

## Test Credentials
See `/app/memory/test_credentials.md`
