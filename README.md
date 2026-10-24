# Aurora Store — Modern E-Commerce Platform

Aurora Store is a polished, production-oriented e-commerce application featuring a modern minimalist interface, a Python FastAPI backend, Neon PostgreSQL, Firebase Google authentication, resilient product imagery, and Paytm Payment Gateway integration.

## Architecture

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons.
- **Backend:** Python FastAPI 0.162+, Pydantic v2, SQLAlchemy 2.0 ORM, psycopg 3.
- **Database:** Neon Serverless PostgreSQL (branch: `ecommerce-store`).
- **Authentication:** Firebase Auth (Google Sign-In) + HMAC-SHA256 session cookies.
- **Payments:** Official Paytm Payment Gateway (v2 All-in-One API).
- **Design:** Modern Minimalist retail aesthetic informed by Google Stitch (`projects/18433139177372353927`).

---

## Quick Start

### 1. Prerequisites
- Node.js v20+ / v24
- Python 3.11+ / 3.15
- Neon PostgreSQL Account

### 2. Frontend Setup
```powershell
# Install Node dependencies
npm ci

# Run development server
npm run dev
# Accessible at http://localhost:3000
```

### 3. Backend Setup
```powershell
# Create & activate virtual environment
py -m venv .venv
.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt pytest

# Run FastAPI backend
uvicorn backend.app.main:app --reload --port 8000
# Accessible at http://localhost:8000
# Swagger API docs at http://localhost:8000/docs
```

---

## Project Documentation

- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)
- [Design Specification & Tokens](docs/DESIGN.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [Paytm Payment Setup Guide](docs/PAYTM_SETUP.md)
- [Test Report & Validation](docs/TEST_REPORT.md)
- [Initial Codebase Audit](docs/INITIAL_AUDIT.md)

---

## Testing

```powershell
# Frontend TypeScript check & unit tests
npm run typecheck
npm test

# Backend Pytest suite
$env:PYTHONPATH="."
pytest backend/tests/ -v
```
