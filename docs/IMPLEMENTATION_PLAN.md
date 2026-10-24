# Implementation Plan — E-Commerce Redesign, FastAPI Migration & Production Hardening

## 1. Project Baseline & Mission
- **Repository:** `sarveshsinghthakur/ecommerce`
- **Active Branch:** `redesign/fastapi-modern-store` (branched from `main`)
- **Mission:** Transform Aurora Store into a modern minimalist e-commerce application with a Python FastAPI backend, Neon PostgreSQL integration, Firebase Authentication, robust product imagery, and Paytm payment gateway.

---

## 2. Implementation Phases

### Phase 1: Design System & Design Tokens (`docs/DESIGN.md`)
- Connected to Google Stitch MCP project `projects/18433139177372353927`.
- Modern minimalist retail design with light neutral surfaces (`#fbfcfd`), deep charcoal/black readable typography (`#0f172a`), subtle warm accents, and responsive layout grids.
- Implement comprehensive dark mode with persistent user preference (`theme` cookie/localStorage and head script to eliminate flash).
- Save `docs/DESIGN.md` capturing all tokens, typography, surfaces, and component states.

### Phase 2: Responsive Frontend Modernization
- Next.js 16 + React 19 + TypeScript + Tailwind CSS v4.
- Polish mobile navigation, drawer shopping cart, search filter bar, sorting, and responsive product grids.
- Implement Wishlist drawer/page, Reviews preview, and Customer Account pages.
- Add robust theme toggle component with instant hydration.
- Ensure accessible touch targets (44px min), focus rings, and zero horizontal overflow across 320px to 4K resolutions.

### Phase 3: Python FastAPI Backend Migration
- Migrate server-side business logic into `backend/`:
  - `backend/app/main.py`: FastAPI application entrypoint with CORS, error handlers, and lifecycle hooks.
  - `backend/app/core/config.py`: Pydantic settings loading from `.env`.
  - `backend/app/core/security.py`: Auth utilities, session verification, and token handlers.
  - `backend/app/db/session.py` & `base.py`: SQLAlchemy 2.0 async engine & session pool.
  - `backend/app/models/`: SQLAlchemy ORM models mirroring existing Neon schema (`User`, `Product`, `Category`, `Order`, `Cart`, `Payment`, `Review`, `Wishlist`).
  - `backend/app/schemas/`: Pydantic request/response schemas.
  - `backend/app/services/`: Business services (Catalog, Cart, Checkout, Order, Payment, Auth).
  - `backend/app/integrations/`: Firebase token verification and Paytm Gateway API client.
  - `backend/app/api/v1/`: Versioned REST endpoints (`/health`, `/auth`, `/catalog`, `/cart`, `/checkout`, `/orders`, `/payments`, `/wishlist`).
  - `backend/tests/`: Pytest suite for API endpoints, payment signatures, and order calculations.

### Phase 4: Neon PostgreSQL Verification & Alignment
- Active Neon branch: `br-hidden-forest-a14nyigq` (`ecommerce-store`).
- Active Database: `ecommerce`.
- 45 products already seeded; verify all 30 tables and relationships.
- Configure secure pooled connection string via environment variables (`DATABASE_URL`).

### Phase 5: Firebase Authentication & Security
- Frontend: Firebase Web SDK Google Sign-in flow + Session sync.
- Backend: Firebase ID token verification using Firebase Admin SDK with public key verification fallback.
- Derive internal user IDs from verified Firebase UIDs.
- Role-based authorization for admin endpoints (`admin` vs `customer`).

### Phase 6: Product Images & Catalog Data Fix
- Fix product image URLs to provide crisp, high-resolution, reliable product photography.
- Implement `ImageWithFallback` React component with automatic placeholder fallback, skeleton loading, and zero layout shift.
- Validate and normalize catalog image URLs.

### Phase 7: Paytm Payment Gateway Integration
- Replace Razorpay with Paytm Payment Gateway.
- Server-side transaction token generation (`/api/v1/payments/paytm/initiate`).
- Callback handler (`/api/v1/payments/paytm/callback`) verifying checksum signatures.
- Authoritative transaction status verification (`/api/v1/payments/paytm/status`).
- Idempotent order status updates and duplicate callback suppression.
- Documentation in `docs/PAYTM_SETUP.md`.

### Phase 8: Testing, Verification & Production Documentation
- Frontend typecheck (`tsc --noEmit`), linting, and Next.js build.
- Backend pytest test suite for FastAPI routes and Paytm service.
- End-to-end flow checks in Antigravity browser subagent.
- Produce `docs/ARCHITECTURE.md`, `docs/TEST_REPORT.md`, and updated root `README.md`.
