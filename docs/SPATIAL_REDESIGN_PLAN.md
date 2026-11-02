# Loop Studio — Spatial UI Redesign Plan

**Status: complete.** Every section below was implemented and verified.

Verification gate (all green at completion):

| Check | Result |
| --- | --- |
| `npm run typecheck` | ✅ clean |
| `npm test` | ✅ 56 / 56 passed (5 files) |
| `npm run lint` | ✅ 0 errors (2 pre-existing font warnings in `layout.tsx`) |
| `npm run build` | ✅ succeeds; `/wishlist` + `/api/wishlist` registered |
| Image health (`scripts/verify-images.mjs`) | ✅ `/`, `/products`, `/categories`, `/category/[slug]` → **0 broken, 0 stale-host** |
| Product images | ✅ 45/45 sourced, contact-sheet verified, 0 `picsum` rows left in DB |
| Category covers | ✅ 10/10 sourced and applied |
| Reveal audit (`scripts/shot-reveal.mjs`) | ✅ 0 invisible sections + 0 broken images after scroll, desktop **and** mobile |
| Reduced-motion reveal check | ✅ 0 hidden blocks under `prefers-reduced-motion: reduce` |
| Keyboard focus walk | ✅ 14/14 targets visible, in logical order |
| Live routes | ✅ `/`, `/products`, `/product/[slug]`, `/cart`, `/wishlist` → 200 |

Framework: Next.js 16.4.2 (App Router, Turbopack), React 19.3.1, Tailwind **v4** (`@theme`),
Lucide + Material Symbols. **No new dependencies were added** — animation stays hand-rolled CSS +
IntersectionObserver in `src/components/animated/`, matching the brief's "avoid unnecessary
dependencies". `framer-motion` was deliberately *not* introduced.

---

## 1. Design system — `src/app/globals.css` ✅

- Existing `--color-*`, `--radius-*`, `--space-*`, `--shadow-*`, `type-*` tokens **retained
  untouched** — hundreds of call sites depend on them. Spatial tokens are purely additive.
- Added `--spatial-1 … --spatial-5` elevation, `--radius-panel/tile/sheet`, `--ease-spatial`,
  `--ease-spring`, `--dur-fast/base/slow`, with dark-mode overrides.
- Added the glass vocabulary: `.glass-inset`, `.glass-surface`, `.glass-raised`, `.glass-hero`,
  `.glass-sheen` — four named depth steps so hierarchy stays readable in greyscale.
- Added derived ready-to-use colors (`--glass-fill`, `--glass-fill-strong`, `--glass-fill-soft`,
  `--glass-line`, `--glass-line-strong`, `--glass-ring`) declared once in `:root`. Because custom
  properties resolve against the element's own computed values, the `.dark` triplet overrides flow
  through automatically without repeating them per theme.
- Added motion helpers (`depth-lift`, `parallax-layer`, `parallax-tilt`, `sheen-follow`,
  `float-slow/slower`, `spatial-rise/slide-right/fade`) and extended the
  `prefers-reduced-motion` kill-switch to cover **all** of them plus `[data-reveal]`.

### Bug fixed here: glass classes outranked Tailwind

`.glass-*` were declared unlayered, so they beat the `utilities` layer. Any element that combined
`glass-surface` with `absolute` silently lost its positioning — the product gallery's wishlist
heart was rendering in the wrong place. The surface rules now live in `@layer components`, so
ordinary utilities (`position`, `z-index`, `border-radius`) override them as expected.

Also added a global scroll-margin so in-page anchors (`#reviews`) clear the floating header:
```css
:where(h1, h2, h3, h4, section[id], [id^="tab-"]) {
  scroll-margin-top: calc(var(--header-h, 5.5rem) + 1rem);
}
```

## 2. Spatial primitives — `src/components/spatial/` ✅

- `pointer-context.tsx` — `PointerProvider`, `usePointerPosition`, `useReducedMotion`,
  `useHasFinePointer`, `useTilt`.
- `section-heading.tsx` — shared eyebrow / title / description / action header, with an `id` prop
  so a parent `<section>` can wire `aria-labelledby`.
- `spatial-section.tsx` — canonical section wrapper (container + vertical rhythm + optional
  glass surface).
- `index.ts` barrel.

**Parallax design:** a single rAF-throttled `PointerProvider` publishes `--px`/`--py` once on
`<html>`, so one listener drives every layer without triggering React re-renders.

## 3. Global navigation ✅

- `site-header.tsx` — floating inset glass bar that condenses on scroll and **self-measures** its
  height into `--header-h` (ResizeObserver) instead of the old hard-coded `pt-40`.
- `mega-menu.tsx` (new) — spatial category mega-menu, keyboard accessible.
- `search-box.tsx` (new) — ARIA combobox with debounced live suggestions, keyboard navigation.
- `api/search/suggest/route.ts` (new) — typeahead endpoint (rate-limited, abortable, fail-soft).
- `mobile-store-dock.tsx` — now theme-aware, and gained a **Saved** entry.
- `site-footer.tsx` — rewritten.

### Bug fixed: footer links

The old footer repeated `/about` five times under distinct labels ("Careers", "Press Kit",
"Engineering Blog"…) and rendered a newsletter form whose submit silently reloaded the page. All
links now point at routes that exist, the dead form is gone, and an "Your account" block links to
Wishlist / Orders / Bag / Support.

## 4. Homepage ✅

- `hero-carousel.tsx` — layered cinematic hero with scrim, pause-on-hover/focus, arrow-key
  control, reduced-motion aware. Fixed the duplicated "₹1,500 OFF" offer text.
- `category-grid.tsx` — restyled; replaced the background-image div with `ImageWithFallback` so
  broken imagery gets the real fallback treatment.
- `deal-cards.tsx` — **fixed all broken token references** (`type-caption`, `--color-text`,
  `--color-bg`, `--shadow-soft` …) which had left the Flash Sale section unstyled.
- `editorial-collections.tsx` — the whole tile is now a single link target (previously only the
  small "read more" text was clickable).
- `budget-section.tsx` — restyled; price bands are now a real `role="tablist"`/`tabpanel` pair.
- `trust-banner.tsx` — Lucide icons, `SectionHeading`, `Reveal` stagger.

## 5. Product cards ✅

- `product-card.tsx` — glass card, image-first, floating discount/bestseller chips, animated
  wishlist, `depth-lift` hover, availability label. Exports `ProductGrid`.
- `wishlist-button.tsx` — Lucide `Heart`, spring scale, fill + ping ring when active.

## 6. Product details ✅

All fabricated content removed; everything is now derived from the real catalogue row.

- **`detail-buy-box.tsx`** — deleted the hardcoded colour/edition configurator, fake bank offers,
  fake pincode ETA, fake countdown, "Only 14 units left", "412 answered questions" and
  "1.2k+ bought last month". Now shows real price, real savings, real rating/review count, real
  stock state (with a genuine low-stock warning only when `stockQuantity <= 5`), and a real
  category link. **"Buy now" is now functional** — it adds the line then routes to `/checkout`.
- **`detail-feature-cards.tsx`** — the hardcoded headphone specs (40mm drivers, 65h battery, LDAC)
  shown on *every* product are gone. The section now renders the product's **real stored
  description** split into paragraphs, plus a fact list from brand/category/rating, and returns
  `null` when there is no description.
- **`detail-specs-table.tsx`** — the invented 8-row spec sheet and the "frequently bought
  together" bundle (fake "Gold Aux Cable", fake ₹5,197 total, non-functional "Add All 3 to Cart")
  are gone. Rows are computed from the catalogue, and "Add all to cart" now actually adds each
  related item and reports a real result.
- **`detail-reviews.tsx`** — deleted the fabricated reviewer names, star distribution, customer
  photo gallery and "97% recommend" copy. Now shows the real aggregate rating and review count,
  and states plainly that written reviews aren't published rather than inventing them.
- **`detail-media-gallery.tsx`** — removed the fabricated "Hot Deal" badge (bestseller chip now
  only renders when the catalogue flags it), added keyboard arrow navigation between thumbnails
  and a toggleable zoom stage.
- **`detail-related.tsx`** — replaced duplicated markup whose "Add" button had **no onClick**
  with the shared `<ProductCard>` / `<ProductGrid>`, so the rail has the same working add-to-cart
  and wishlist actions as the listing pages.
- **`share-button.tsx`** (new) — the decorative "Share" button that did nothing now uses the Web
  Share API with a clipboard fallback.
- `product/[slug]/page.tsx` — restyled; breadcrumb, sticky gallery, `#reviews` anchor.

## 7. Cart, wishlist, checkout ✅

- `cart-drawer.tsx` — rewritten. Was hardcoded to `white/10` (broken in light mode); now uses the
  theme-aware glass tokens. Added focus trap, Escape-to-close, body scroll lock, focus return to
  the opener, an animated free-shipping progress bar with `role="progressbar"`, and a proper
  empty state.
- `cart-page.tsx` — restyled; logic untouched (quantity stepper, remove, clear, totals).
- **`/wishlist` page (new)** — `src/app/(store)/wishlist/page.tsx` +
  `wishlist-grid.tsx`. The proxy (`src/proxy.ts`) already listed `/wishlist` in `AUTH_PREFIXES`,
  so the route was anticipated but never built; it now lands correctly behind auth.
- `api/wishlist/route.ts` (new) — POST `{ ids }` hydrates the client-side wishlist into real
  catalogue rows. Rate-limited, fail-soft, returns an empty list for malformed input.
- `server/catalog.ts` — added `getProductsByIds(ids, limit)` (published products only, preserving
  the shopper's own ordering).
- `checkout-form.tsx` — restyled; payment/address logic untouched.

> Note: the wishlist is **still localStorage-only** (`loop_wishlist`) — Loop Studio has no backend
> wishlist store, so nothing is shared across devices. The new page states this rather than
> implying server-side persistence.

## 8. Product & category imagery ✅

The seed invented `picsum.photos` URLs, so a backpack rendered a beach and a dog toy rendered a
mountain. Every photograph in the catalogue is now a **real, locally hosted, visually verified**
image that matches its product.

**Sourcing pipeline** (`scripts/source-images.mjs`) — Wikimedia Commons (free-licensed, keyless,
no runtime hotlinking) downloaded into `public/`:

- Terms are **arrays** tried specific → general. Commons ANDs every word of a query, so a phrase
  like "hiking daypack backpack" returns nothing; broad fallbacks guarantee a hit.
- `cat:` prefixed terms read a curated Commons **category** instead of free-text search — free
  text returns a tree species for "tawa" and a politician for "kurti", a category cannot drift.
- Three gates decide what may be downloaded:
  - `MUST` — strict keyword gate for free-text results, **never relaxed** (relaxing it is what
    let a photo of the Sun win "magnetic building tiles"). Skipped for `cat:` lookups, whose
    filenames are arbitrary.
  - `PREFER` — softer gate + `+8` score boost, so a category still surfaces the object rather
    than whichever member is sharpest.
  - `NEGATIVE` — rejects renders, diagrams, ceremonies, landscapes, trucks …
- `isBitmap` rejects non-photographs: Commons returns `.ogg`/`.svg` from category listings, and
  an `.ogg` has a generated waveform *thumbnail* that sails past a `content-type` check (an audio
  file briefly shipped as the Fashion cover).
- Scoring prefers near-square, ≥700px shots; downloads and searches retry with backoff because
  Commons throttles bursts (a 429 used to be misread as "this product has no image").

**Verification is visual, not just programmatic:** `scripts/contact-sheet.mjs` +
`shot-contact-sheet.mjs` build one grid of all 45 products labelled with their titles, which is
eyeballed end-to-end; `contact-sheet-categories.mjs` does the same for the 10 covers. Several
rounds were required — a vintage ad, a shipping-container yard and a Blender splashscreen all
passed the first pass.

**Applied to the database** (`scripts/apply-images.mjs`): 45 `product_images` rows rewritten to
`/images/products/<slug>.jpg`, 90 `picsum` gallery placeholders deleted (one curated row per
product now), and 10 `categories.image_url` covers set. `source = 'curated'`.

**Self-hosted:** the 3 hero-carousel images were hotlinked from Google's `lh3.googleusercontent`
CDN (link rot the moment the token rotates) → `public/images/editorial/hero-{1,2,3}.jpg`.
**Zero external image hotlinks remain in `src/`.**

**Re-seed safe:** `src/db/seed.ts` `imageUrlFor(slug)` now resolves the curated file if it
exists, else `/images/product-placeholder.svg`, and writes a single `source: "curated"` row —
re-running the seed reproduces this imagery instead of wiping it.

## 9. Verification ✅

- `npm run typecheck` — clean after every change.
- `npm test` — 56/56. `tests/image-with-fallback.test.ts` still asserts `role="img"`, the exact
  fallback `/images/product-placeholder.svg`, `.skeleton` and "Image unavailable"; all four
  preserved.
- `npm run lint` — 0 errors (only the 2 pre-existing `no-page-custom-font` warnings).
- `npm run build` — succeeds.
- **Screenshots** at 1440×900 and 390×844 via `scripts/shot-viewport.mjs` and
  `scripts/shot-verify.mjs` (`screenshots/`, `screenshots-v2/`, `screenshots-v4/run-*`).
- **Theme + motion + keyboard** via `scripts/verify-spatial.mjs` (`screenshots-v3/`): light/dark
  on home, product and listing; reduced-motion assertion that no `[data-reveal]` block stays
  hidden; a 14-step Tab walk confirming every focus target is visible.
- **Wishlist end-to-end** via `scripts/shot-wishlist.mjs`: seeds `loop_wishlist`, signs in through
  the `AUTH_TEST_MODE` shim, and confirms a stored id resolves to a real product card.

### Helper scripts added

| Script | Purpose |
| --- | --- |
| `scripts/shot-viewport.mjs` | route screenshots at desktop + mobile |
| `scripts/verify-spatial.mjs` | dark mode, reduced motion, keyboard focus assertions |
| `scripts/shot-wishlist.mjs` | authenticated wishlist end-to-end check |
| `scripts/source-images.mjs` | Commons sourcing (`--categories`, `--force`, `--dry`) |
| `scripts/apply-images.mjs` | writes `product_images` + `categories.image_url` (`--write`) |
| `scripts/contact-sheet.mjs` / `-categories.mjs` | build the visual verification grids |
| `scripts/shot-contact-sheet*.mjs` | capture those grids to PNG for eyeballing |
| `scripts/verify-images.mjs` | DOM image health: broken / stale-host / category covers |
| `scripts/shot-full.mjs` | full-page captures with lazy→eager forcing |
| `scripts/shot-verify.mjs` | timestamped desktop+mobile capture set (unique dir per run) |
| `scripts/shot-reveal.mjs` | scrolls like a user, audits for still-invisible sections |
| `scripts/fetch-hero-images.mjs` | self-hosts the hero carousel images |
| `scripts/db-images.mjs` / `db-categories.mjs` | dump current DB image state |

---

## Known limitations (deliberate, not regressions)

- **No written reviews exist in the catalogue.** The reviews panel shows the real aggregate
  rating and says so honestly, instead of shipping invented review text.
- **No newsletter API**, so the footer newsletter form was removed rather than left as a
  no-op that silently reloaded the page.
- **Wishlist is per-device** (localStorage) — there is no backend wishlist table in use.
- **Imagery is object-accurate, not SKU-accurate.** Commons photographs generic products well
  but has no reason to carry a specific Indian-market SKU, so a boAt earbud listing shows a
  generic pair of TWS earbuds. Every image matches its *product type*; none is the exact branded
  packshot. Retailer CDNs were rejected (copyrighted, hotlink-protected, link rot).
- `src/lib/api-client.ts` remains untouched dead code for a removed FastAPI backend.
- `/checkout` and `/orders` require a session (`src/proxy.ts`), so they can only be screenshotted
  while signed in; this is pre-existing intended behaviour.
