# Initial Audit — Aurora Store E-Commerce

**Date:** 2026-10-24
**Repository:** github.com/sarveshsinghthakur/ecommerce
**Branch:** main

---

## 1. Architecture Overview

### Current Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.4.2 |
| Language | TypeScript | 5.9.3 |
| UI | React | 19.3.1 |
| Styling | Tailwind CSS v4 | 4.3.3 |
| Database | Neon PostgreSQL (via `pg` + `@neondatabase/serverless`) | — |
| ORM | Drizzle ORM | 0.45.4 |
| Auth | Firebase Auth (Web SDK + Admin SDK) | 13.0.0 / 14.5.0 |
| Payments | Razorpay | 2.9.8 |
| AI | Mistral AI (product import) | 2.7.0 |
| Icons | Lucide React | 1.59.0 |
| Validation | Zod v4 | 4.6.7 |
| Testing | Vitest | 5.0.5 |
| Build | Turbopack (Next.js) | — |

### Project Name
"Aurora Store" — described as a "Product-import driven e-commerce platform."

### Directory Structure
```
├── docs/                     # (new - created by this audit)
├── scripts/                  # DB migration, seeding, verification scripts
│   ├── create-db.ts
│   ├── migrate.ts
│   ├── probe-db.ts
│   └── verify-schema.ts
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── (admin)/          # Admin layout group
│   │   │   └── admin/        # Admin dashboard, products, orders
│   │   ├── (store)/          # Customer-facing storefront
│   │   │   ├── about/
│   │   │   ├── cart/
│   │   │   ├── categories/
│   │   │   ├── category/[slug]/
│   │   │   ├── checkout/
│   │   │   ├── contact/
│   │   │   ├── faq/
│   │   │   ├── forgot-password/
│   │   │   ├── login/
│   │   │   ├── orders/
│   │   │   ├── product/[slug]/
│   │   │   ├── products/
│   │   │   ├── search/
│   │   │   ├── signup/
│   │   │   └── (static pages: privacy, terms, shipping, returns)
│   │   ├── api/              # Next.js API Routes
│   │   │   ├── auth/         # Session, logout, me
│   │   │   ├── cart/         # Cart CRUD
│   │   │   ├── checkout/     # Order placement
│   │   │   ├── contact/      # Contact form
│   │   │   └── payments/     # Razorpay create/verify/webhook
│   │   ├── globals.css       # Design tokens (Tailwind v4 @theme)
│   │   └── layout.tsx        # Root layout
│   ├── components/
│   │   ├── auth/             # Login, signup, forgot-password forms
│   │   ├── layout/           # SiteHeader, SiteFooter, BrandMark
│   │   ├── product/          # ProductCard, PurchasePanel
│   │   ├── store/            # CartPage, CheckoutForm, PaymentPanel, etc.
│   │   └── ui/               # Button, Card, Dialog, Input, Toast, Badge, etc.
│   ├── db/
│   │   ├── schema/           # Drizzle schema (auth, catalog, commerce, content)
│   │   ├── migrations/       # SQL migrations
│   │   ├── seed.ts           # Demo data seeding
│   │   └── index.ts          # DB connection (pg Pool)
│   ├── lib/
│   │   ├── auth/             # Firebase admin/client, session cookies, ID token verify
│   │   ├── cart/             # Cart context, server-side cart logic
│   │   ├── pricing/          # Pricing engine with markup calculations
│   │   └── (utilities)       # env, money, format, ids, slug, cn, rate-limit, etc.
│   └── server/               # Server-only business logic
│       ├── admin.ts          # Admin queries
│       ├── catalog.ts        # Product/category queries (published-only scope)
│       ├── checkout.ts       # Order placement logic
│       ├── orders.ts         # Order retrieval
│       └── payments.ts       # Razorpay integration, signature verification
├── tests/
│   └── server-only-stub.ts   # Test helper
├── .env.example              # Well-documented env template
├── drizzle.config.ts
├── next.config.ts            # Security headers, CSP
├── package.json
├── requirements.txt          # Python FastAPI dependencies (already present!)
└── vitest.config.mts
```

---

## 2. Existing Features (Working or Partially Implemented)

### ✅ Well-Implemented
1. **Database Schema** — Comprehensive Drizzle schema with 20+ tables covering users, addresses, categories, products, product images, variants, pricing history, source listings, import jobs, carts, orders, payments, wishlists, reviews, contact messages, content pages, store settings, admin roles, audit events
2. **Authentication** — Firebase Auth with Google sign-in, email/password, session cookies (Web Crypto HMAC-signed), test mode for local dev, ID token verification (both Admin SDK and public-key fallback)
3. **Authorization** — Role-based access control (customer/admin), environment-driven admin bootstrap, delegated admin roles, ownership checks on orders/carts/addresses
4. **Product Catalog** — Full-text search (tsvector), category browsing, sorting (newest/price/rating), filtering, pagination, product variants support
5. **Cart System** — Anonymous carts (httpOnly cookie), authenticated carts (DB-backed), guest cart merge on sign-in, quantity limits, stock validation
6. **Checkout** — Multi-step checkout with address, order summary, payment method selection, server-calculated totals, shipping fees, idempotent order placement
7. **Payment** — Razorpay integration with order creation, signature verification, webhook handler, idempotent payment marking, test mode fallback
8. **Admin Panel** — Product management, order management, dashboard with stats
9. **Security** — CSP headers, rate limiting, audit logging, input validation (Zod), server-only imports, HMAC session cookies, no secrets in client bundles
10. **Data Integrity** — Transaction boundaries, inventory checks, price-change detection at checkout, duplicate prevention
11. **SEO** — Metadata, OpenGraph, viewport configuration
12. **Pricing Engine** — Markup calculations from source prices with price history tracking

### ⚠️ Partially Implemented / Needs Attention
1. **Product Images** — Images are hotlinked from marketplace CDNs. `next/image` is deliberately not used for remote hosts (per `next.config.ts` comment). Plain `<img>` tags are used. Could be fragile if CDN URLs expire.
2. **Wishlist** — Schema exists in commerce.ts (wishlists, wishlistItems tables) but no wishlist UI pages found in routes
3. **Reviews** — Schema exists (reviews table with approval status) but no review submission UI found
4. **Dark Mode** — CSS variables defined but no toggle mechanism or preference persistence found in the codebase
5. **Admin Product CRUD** — Admin pages show product listing but full create/edit forms may be incomplete
6. **Coupons** — Not found in schema or code

---

## 3. Migration Requirements Analysis

### Payment Gateway: Razorpay → Paytm
The current implementation uses **Razorpay** with a complete integration:
- `razorpay` npm package (v2.9.8)
- Server-side order creation, signature verification, webhook handling
- Client-side Razorpay Checkout SDK
- Environment variables: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`

**Migration effort:** HIGH — Complete replacement of payment flow including:
- Server-side: Replace Razorpay SDK with Paytm SDK/API
- Client-side: Replace Razorpay checkout with Paytm checkout
- Webhook handler: New Paytm callback/webhook processing
- CSP headers: Update to allow Paytm domains

### Backend: Next.js API Routes → FastAPI
Current server-side logic is clean and well-separated:
- `src/server/` — Pure business logic (no Next.js dependencies)
- `src/app/api/` — Thin Next.js route handlers that call business logic
- `src/lib/auth/` — Auth logic with some Next.js coupling (cookies(), headers())

**Migration strategy:**
1. The `requirements.txt` already exists with FastAPI dependencies — this was clearly anticipated
2. Business logic in `src/server/` is well-structured for migration
3. Auth session management needs adaptation (currently uses Next.js cookies API)
4. Database layer (Drizzle ORM) needs SQLAlchemy equivalent

### Database
Already using Neon PostgreSQL with Drizzle ORM. Migration to SQLAlchemy for FastAPI backend while potentially keeping Drizzle for Next.js SSR queries during transition.

---

## 4. Discovered Issues

### 🔴 Critical
1. **No `.env.local` present** — App requires configuration to run (expected — this is a security feature)
2. **Razorpay CSP domains hardcoded** — Need updating for Paytm migration
3. **No CI/CD pipeline** — No GitHub Actions workflow found

### 🟡 Moderate
1. **Image hotlinking** — Product images from external CDNs may break. No fallback image implementation found in ProductCard
2. **No dark mode toggle** — Design tokens exist but no user-facing toggle
3. **Missing wishlist UI** — Schema exists but no pages
4. **Missing review submission UI** — Schema exists but no pages
5. **`server-only` dependency** — Several files import `server-only` which isn't available outside React Server Components context (test stub exists)
6. **Middleware file** — `src/proxy.ts` appears to be middleware but doesn't follow Next.js middleware.ts convention

### 🟢 Minor
1. **AGENTS.md** — Auto-generated by Next.js dev server, not project documentation
2. **No README.md** — Project lacks documentation
3. **`requirements-dev.txt`** exists (70 bytes) — likely pytest/dev tools
4. **Turbopack root workaround** — Comment mentions D:\ drive issue, may be machine-specific

---

## 5. Security Assessment

### ✅ Good Practices Found
- Secrets in `.env.local` (gitignored)
- Session cookies signed with HMAC (Web Crypto)
- Firebase ID token verification with public key fallback
- Rate limiting on sensitive endpoints
- Input validation with Zod schemas
- `server-only` imports preventing secret leakage
- CSP headers configured
- Audit logging for sensitive operations
- Ownership checks on resources
- Idempotent payment processing

### ⚠️ Concerns
- `SESSION_SECRET` generation/rotation not documented
- CORS not explicitly configured (relies on same-origin via Next.js)
- No CSRF protection documented (mitigated by SameSite cookies)
- Admin access controlled by environment variable emails — no UI for role management beyond initial bootstrap
- `unsafe-inline` and `unsafe-eval` in CSP script-src (needed for Next.js/Firebase)

---

## 6. Migration Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Payment flow replacement | HIGH | Build Paytm integration alongside Razorpay, switch atomically |
| Auth session compatibility | MEDIUM | FastAPI must validate same session cookies or use Firebase tokens directly |
| Database schema divergence | MEDIUM | Use Alembic migrations alongside Drizzle migrations during transition |
| Image URL expiration | LOW-MEDIUM | Implement image validation and fallback system |
| TypeScript ↔ Python type drift | MEDIUM | Generate OpenAPI spec from FastAPI, use typed client in frontend |
| Dark mode flash | LOW | Implement with `<script>` in `<head>` for early theme detection |

---

## 7. Recommendations

1. **Keep Next.js frontend** — The existing React/TypeScript codebase is well-structured and should be preserved
2. **FastAPI as parallel backend** — Add FastAPI backend alongside Next.js API routes, migrate gradually
3. **Paytm integration** — Replace Razorpay with Paytm using the same architectural pattern (server-side initiation + verification)
4. **Design system** — Formalize the existing Tailwind v4 @theme tokens into a documented design system
5. **Dark mode** — Add toggle component and `prefers-color-scheme` support using existing CSS variables
6. **Images** — Add fallback images, validate URLs, consider proxying through a CDN
7. **Testing** — Expand test coverage beyond the 2 existing test files
