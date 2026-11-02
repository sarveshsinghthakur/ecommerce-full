# Design HTML Analysis — Implementation Reference

Analysis of all 4 design HTML files in `designs/` directory.

---

## 1. SHARED DESIGN TOKENS (Tailwind Config)

The Tailwind config is **identical across all 4 files** (embedded in `<script id="tailwind-config">`).

### Colors (Material Design 3 token system)

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#003bc7` | Primary buttons, links, active states, logo text |
| `primary-container` | `#2855e8` | Hover state for primary buttons |
| `primary-fixed` | `#dde1ff` | Light primary backgrounds |
| `primary-fixed-dim` | `#b8c4ff` | Toast icon accent |
| `on-primary` | `#ffffff` | Text on primary |
| `on-primary-container` | `#dce0ff` | Text on primary-container |
| `on-primary-fixed` | `#001453` | Dark text on primary-fixed |
| `on-primary-fixed-variant` | `#0037b9` | Variant |
| `secondary` | `#575e70` | Step 4 (confirmation) inactive, phone icon |
| `secondary-container` | `#d9dff5` | Review avatar bg |
| `secondary-fixed` | `#dce2f7` | "NEW" badge bg |
| `secondary-fixed-dim` | `#c0c6db` | |
| `on-secondary` | `#ffffff` | |
| `on-secondary-container` | `#5c6274` | Order summary item count text |
| `on-secondary-fixed` | `#141b2b` | Text on secondary-fixed badges |
| `on-secondary-fixed-variant` | `#404758` | |
| `tertiary` | `#6d4300` | "Under ₹499 Bazaar" nav, trust badges, lock icon |
| `tertiary-container` | `#8d5900` | Cart count badge, deal "DEAL OF DAY" badge, budget tags |
| `on-tertiary-container` | `#ffdcb7` | Text on tertiary-container (dark amber) |
| `tertiary-fixed` | `#ffddb8` | Light amber for "Under ₹499" links |
| `tertiary-fixed-dim` | `#ffb95f` | |
| `on-tertiary` | `#ffffff` | |
| `on-tertiary-fixed` | `#2a1700` | |
| `on-tertiary-fixed-variant` | `#653e00` | |
| `error` | `#ba1a1a` | "Today's Deals" nav, discount badges, wishlist badge bg, flash deal icons |
| `error-container` | `#ffdad6` | Light error bg (hover on Today's Deals) |
| `on-error` | `#ffffff` | Text on error |
| `on-error-container` | `#93000a` | |
| `background` | `#f8f9ff` | Body background |
| `surface` | `#f8f9ff` | Main content bg, card bg |
| `surface-bright` | `#f8f9ff` | |
| `surface-container-lowest` | `#ffffff` | Cards, header bg, footer bg, product cards |
| `surface-container-low` | `#eff4ff` | Subtle backgrounds, search bar, hero tile bg, input fields |
| `surface-container` | `#e6eeff` | Active nav item bg, toggle inactive, category circle bg |
| `surface-container-high` | `#dee9fc` | Hover states, add-to-cart icon btn bg |
| `surface-container-highest` | `#d9e3f6` | Step 3 inactive circle bg, "ORGANIC" badge bg |
| `surface-variant` | `#d9e3f6` | |
| `surface-dim` | `#d0dbed` | |
| `surface-tint` | `#1e4ee2` | "BESTSELLER" badge bg, promo banner gradient end |
| `on-surface` | `#121c2a` | Primary text color |
| `on-surface-variant` | `#434655` | Secondary/muted text |
| `on-background` | `#121c2a` | |
| `outline` | `#747687` | Placeholder text, icons, dividers |
| `outline-variant` | `#c4c5d8` | Lighter dividers, breadcrumb separators |
| `inverse-surface` | `#27313f` | Dark overlay on hero tiles, modal backdrop |
| `inverse-on-surface` | `#eaf1ff` | |
| `inverse-primary` | `#b8c4ff` | |

### Fonts

| Token | Font Family |
|---|---|
| `display-hero`, `display-hero-mobile` | Plus Jakarta Sans (800) |
| `headline-xl`, `headline-xl-mobile` | Plus Jakarta Sans (700) |
| `headline-lg`, `headline-lg-mobile` | Plus Jakarta Sans (700) |
| `headline-md`, `headline-sm` | Plus Jakarta Sans (600) |
| `title-md` | Plus Jakarta Sans (600) |
| `label-md`, `label-sm` | Plus Jakarta Sans (600) |
| `body-lg`, `body-md`, `body-sm` | Inter (400) |
| `caption-micro` | Inter (500) |

### Font Size Scale

| Token | Size | Line Height | Weight |
|---|---|---|---|
| `display-hero` | 64px | 72px | 800 |
| `display-hero-mobile` | 36px | 44px | 800 |
| `headline-xl` | 40px | 48px | 700 |
| `headline-xl-mobile` | 28px | 36px | 700 |
| `headline-lg` | 32px | 40px | 700 |
| `headline-lg-mobile` | 24px | 32px | 700 |
| `headline-md` | 24px | 32px | 600 |
| `headline-sm` | 20px | 28px | 600 |
| `title-md` | 16px | 24px | 600 |
| `body-lg` | 18px | 28px | 400 |
| `body-md` | 16px | 24px | 400 |
| `body-sm` | 14px | 20px | 400 |
| `label-md` | 14px | 20px | 600 |
| `label-sm` | 12px | 16px | 600 |
| `caption-micro` | 12px | 16px | 500 |

### Border Radius

- `DEFAULT`: 0.25rem (4px)
- `lg`: 0.5rem (8px)
- `xl`: 0.75rem (12px)
- `full`: 9999px (pill)

### Custom Spacing

| Token | Value |
|---|---|
| `space-xs` | 0.5rem (8px) |
| `space-sm` | 0.75rem (12px) |
| `space-md` | 1rem (16px) |
| `space-lg` | 1.5rem (24px) |
| `space-xl` | 2.5rem (40px) |
| `gutter` | 1.5rem (24px) |
| `gutter-sm` | 1rem (16px) |
| `margin` | 2rem (32px) |
| `margin-sm` | 1rem (16px) |

### Other Config

- `darkMode: "class"` — class-based dark mode
- Body class: `bg-background font-body-md text-on-surface antialiased`
- Custom base CSS: hides scrollbars (`::-webkit-scrollbar{display:none}`), resets margins
- Google Fonts loaded: Inter (400-700), Plus Jakarta Sans (500-800)
- **Material Symbols Outlined** loaded via Google Fonts (two link tags for full axis support)
- Images use `data-alt` attribute (custom) for alt text instead of standard `alt`

### Shadows

- Header: `shadow-[0_1px_8px_rgba(0,0,0,0.04)]` — very subtle
- Cards: `shadow-sm` (default Tailwind)
- Hover: `shadow-md`
- Modals/toasts: `shadow-xl`
- Buttons (primary): `shadow-md` → `shadow-lg` on hover
- Quick view trigger: `shadow-md`

---

## 2. SHARED COMPONENT: HEADER (Designs 1, 2, 3)

Present in homepage, product detail, and category listing. **Identical markup** across all three. Checkout (design 4) does NOT use this header.

### Container

```
<header class="fixed top-0 left-0 right-0 z-40 bg-surface-container-lowest/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
  <div class="h-40 max-w-[1440px] mx-auto px-margin-sm lg:px-margin flex flex-col justify-between">
```

- Fixed position, `z-40`, 95% opacity white bg with backdrop blur
- Total height: `h-40` (160px)
- Max width: 1440px centered
- Three rows inside: announcement bar (h-9), main row (h-18), category nav (h-12)

### Row 1: Announcement Bar (`h-9`)

```
<div class="h-9 flex items-center justify-between font-caption-micro text-caption-micro text-on-surface-variant bg-surface-container-low px-space-md rounded-b-lg">
```

- **Left**: Promo text with `local_shipping` icon — "Spring Mega Sale: Extra 15% off with code **LOOP15** | Free delivery over ₹499"
- **Right group** (gap-space-lg):
  - Delivery location: `location_on` icon + "Deliver to Mumbai 400001" (cursor-pointer, hover:text-primary)
  - Currency/language: `language` icon + "INR (₹) / EN" (cursor-pointer, hover:text-primary)
  - "Sell on Loop" link (hover:text-primary)
  - "Customer Support" link (hover:text-primary)

### Row 2: Main Row (`h-18`, py-space-xs)

Four groups left-to-right with `justify-between gap-space-lg`:

**Group A — Logo + Deliver-to button** (`gap-space-md`):
- Logo: `<img>` (h-8) + `<span class="font-headline-sm text-headline-sm text-primary tracking-tight font-bold">Loop Studio</span>` wrapped in `<a data-path="home">`
- Deliver-to button: `hidden xl:flex` — only shows on XL screens (≥1280px). Shows `pin_drop` icon, "Deliver to Priya" (caption-micro) / "Mumbai 400050" (label-sm bold), `keyboard_arrow_down` icon. bg-surface-container-low.

**Group B — Search bar** (`flex-1 max-w-2xl relative`):
- Container: `h-11 bg-surface-container-low rounded-lg px-space-sm focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary`
- Category dropdown button: "All Categories" (`hidden sm:inline`) + `arrow_drop_down` icon, divider `h-5 w-px bg-outline-variant`
- `search` icon (text-outline)
- Input: `placeholder="Search over 250,000+ products, brands and essentials..."`
- Clear button: `close` icon (text-outline, hover:text-on-surface)

**Group C — User actions** (`gap-space-md`):
- Profile: avatar img (w-8 h-8 rounded-full) + `hidden md:flex` column with "Welcome back," (caption-micro) / "Hi, Priya" (label-sm semibold) + `expand_more` icon
- Wishlist: `<a data-path="wishlist">` with `favorite` icon (text-2xl) + badge `absolute top-1 right-1 w-4 h-4 rounded-full bg-error text-on-error` showing "4"
- Cart button: `bg-primary text-on-primary` pill with `shopping_cart` icon + `hidden sm:flex` column ("Cart" caption-micro / "₹2,499" label-sm bold) + count badge `w-5 h-5 rounded-full bg-tertiary-container text-on-tertiary-container` showing "3"

### Row 3: Category Nav (`h-12`)

```
<div class="h-12 flex items-center justify-between font-label-md text-label-md overflow-x-auto">
```

- **All Categories button** (flex-shrink-0, mr-space-md): `menu` icon + "All Categories", bg-surface-container, font-bold
- **Nav links** (`overflow-x-auto whitespace-nowrap`):
  - "Today's Deals" — `text-error` bold, hover:bg-error-container/40 (RED accent)
  - "New Arrivals" — text-on-surface-variant
  - "Electronics" — text-on-surface-variant (in design 2 & 3, this has `aria-current="page"` + active classes `bg-surface-container text-primary font-bold rounded-lg`)
  - "Fashion & Apparel"
  - "Home & Living"
  - "Beauty & Grooming"
  - "Footwear"
  - "Kitchen Essentials"
  - "Under ₹499 Bazaar" — `text-tertiary font-semibold` (AMBER accent)
- **Theme toggle** (flex-shrink-0, ml-space-md): `light_mode` icon button, title="Toggle theme"

### Responsive Behavior

- Announcement bar right items always visible (may wrap on very small screens)
- Deliver-to button: `hidden xl:flex` (only ≥1280px)
- Search "All Categories" label: `hidden sm:inline` (≥640px)
- Profile name column: `hidden md:flex` (≥768px)
- Cart price column: `hidden sm:flex` (≥640px)
- Nav row: horizontally scrollable on small screens (`overflow-x-auto`)

---

## 3. SHARED COMPONENT: FOOTER (Designs 1, 2, 3)

Present in homepage, product detail, and category listing. **Identical markup**. Checkout (design 4) has NO footer.

### Structure

```
<footer class="w-full bg-surface-container-lowest text-on-surface mt-space-xl">
```

### Part 1: Trust Badges Row

```
<div class="bg-surface-container-low py-space-lg">
  <div class="max-w-[1440px] mx-auto px-margin-sm lg:px-margin grid grid-cols-2 md:grid-cols-4 gap-space-md">
```

Four items, each: icon (`text-primary text-3xl`) + title (`font-label-md`) + description (`font-body-sm text-on-surface-variant`):

1. `verified_user` — "100% Genuine" / "Sourced directly from verified brands"
2. `sync` — "7-Day Easy Returns" / "Instant pickup and no-question policy"
3. `lock` — "Secure Payments" / "256-bit SSL encrypted transactions"
4. `headset_mic` — "24/7 Dedicated Care" / "Chat and call support anytime"

### Part 2: Main Footer Grid (6 columns)

```
<div class="max-w-[1440px] mx-auto px-margin-sm lg:px-margin py-space-xl">
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-space-xl">
```

**Column 1-2 (lg:col-span-2): Brand + Newsletter**
- Logo img + "Loop Studio" text (font-headline-sm, text-primary, font-bold)
- Brand description paragraph (font-body-sm, text-on-surface-variant, max-w-sm)
- Newsletter heading "Join the Loop Insider Newsletter" (font-label-md)
- Email input (`h-11 bg-surface-container-low rounded-lg focus:ring-2 focus:ring-primary`) + Subscribe button (`h-11 bg-primary text-on-primary`)

**Column 3: About Loop** (font-label-md uppercase tracking-wider heading)
- Company Profile, Loop Sustainability, Careers at Loop, Press & Media Kit, Engineering Blog

**Column 4: Customer Care**
- Help Center & FAQs, Track Your Delivery, Return & Refund Flow, Shipping Rates & Policy, Report Infringement

**Column 5: Categories**
- Electronics & Audio, Fashion & Apparel, Home Decor & Living, Beauty & Wellness, Kitchen Essentials

**Column 6: Sellers Hub**
- Sell on Loop Studio, Merchant Dashboard, Fulfillment by Loop, Advertise Your Products, Affiliate Program

All list items: `font-body-sm text-body-sm text-on-surface-variant hover:text-primary cursor-pointer transition-colors`

### Part 3: Payment Partners + Copyright

```
<div class="mt-space-xl pt-space-lg flex flex-col md:flex-row items-center justify-between gap-space-md font-caption-micro text-caption-micro text-on-surface-variant">
```

- Payment partners: "Payment Partners:" + pills (UPI, RuPay, VISA, Mastercard, NetBanking) — each `px-2 py-1 rounded bg-surface-container font-bold text-on-surface`
- Copyright: "© 2025 Loop Studio Technologies Pvt Ltd. All rights reserved. Built for modern retail excellence."

---

## 4. PAGE ANALYSIS: DESIGN 1 — HOMEPAGE

### Body & Main

```
<body class="bg-background font-body-md text-on-surface antialiased">
<main class="w-full pt-40 bg-surface min-h-[calc(100vh-160px)]">
```

`pt-40` (160px) clears the fixed header. Inner wrapper: `<div class="flex flex-col w-full">`

### Sections in Order

#### Section 1: Hero & Featured Promotions
`<section class="max-w-[1440px] mx-auto w-full px-margin-sm lg:px-margin pt-space-md pb-space-lg">`

12-column grid (`grid-cols-1 lg:grid-cols-12 gap-gutter items-stretch`):

- **Main Carousel Hero (lg:col-span-8)**: `relative rounded-xl overflow-hidden shadow-sm bg-surface-container-low min-h-[460px] lg:min-h-[500px]`
  - Slide content (`hero-slide relative z-10 p-space-lg lg:p-space-xl`):
    - Badge: "EXCLUSIVE TECH LAUNCH" pill (`bg-primary/10 text-primary rounded-full`)
    - H1: "The Tech & Audio Fest" (font-headline-xl)
    - Subtitle: "Up to 60% off..." (font-body-lg text-on-surface-variant)
    - Card promo: glassmorphism `bg-surface-container-lowest/80 backdrop-blur-md` — "Instant ₹1,500 OFF on ICICI & HDFC bank cards"
    - CTAs: "Shop Deals Now" (bg-primary, shadow-md) + "Explore Audio" (bg-surface-container)
    - Carousel dots: 3 buttons (active = `w-8 h-2 bg-primary`, inactive = `w-2.5 h-2 bg-outline-variant`)
  - Background: `absolute inset-0 z-0 bg-cover bg-right` with gradient overlay `from-surface-container-low via-surface-container-low/85 to-transparent`

- **Paired Editorial Promo Tiles (lg:col-span-4)**: `flex flex-col sm:flex-row lg:flex-col gap-gutter`
  - Tile 1: Fashion — "Spring Capsule Wardrobe" — image bg with `group-hover:scale-105`, gradient `from-inverse-surface/90`, badge "Curated Wardrobe" (bg-tertiary-container)
  - Tile 2: Smart Living — "Smart Home Revolution" — badge "Home Innovation" (bg-primary)

#### Section 2: Shop by Category
`<section class="max-w-[1440px] mx-auto w-full px-margin-sm lg:px-margin py-space-lg">`

- Header: "Explore Departments" (font-headline-md) + subtitle + "All 48 Categories" link with `arrow_forward`
- 8 category cards in `grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-space-sm`
- Each card: circular image (`w-16 h-16 rounded-full`) + name (font-label-sm) + item count (font-caption-micro)
- Hover: `hover:-translate-y-1 hover:bg-surface-container`
- Categories: Fashion & Apparel (38k+), Footwear (14k+), Electronics (42k+), Home & Living (29k+), Kitchen & Dining (18k+), Beauty & Care (22k+), Sports & Fitness (11k+), Bags & Luggage (9k+)

#### Section 3: Today's Deals (Flash Deals with Countdown)
`<section class="max-w-[1440px] mx-auto w-full px-margin-sm lg:px-margin py-space-lg">`

- Container: `bg-surface-container-lowest p-space-lg rounded-xl shadow-sm`
- Header: "FLASH DEALS" pill (bg-error) + "Steal Deals of the Day" + countdown `id="deal-timer"` showing "05h : 22m : 41s" with `timer` icon + "View All Deals (48)" link
- 4 deal cards in `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter`
- Each card structure:
  - Image area: `aspect-square bg-surface-container-low`, `group-hover:scale-105`
  - Discount badge: `absolute top-2 left-2 bg-error text-on-error` (e.g., "56% OFF")
  - Wishlist button: `absolute top-2 right-2 w-8 h-8 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm`
  - Content: rating (star icon + 4.8 + count), title (line-clamp-2), price (headline-sm bold) + strikethrough MRP
  - Progress bar: "Claimed: 78%" + "14 units left" with `w-full h-1.5 bg-surface-container-high rounded-full` and inner `bg-error` or `bg-primary` bar
  - Add to Cart button: `w-full bg-primary text-on-primary` with `shopping_bag` icon

#### Section 4: Editorial Discovery Collections
`<section class="max-w-[1440px] mx-auto w-full px-margin-sm lg:px-margin py-space-lg">`

- 3 curated banners in `grid grid-cols-1 md:grid-cols-3 gap-gutter`
- Each: `relative rounded-xl overflow-hidden p-space-lg min-h-[300px]` with bg image, gradient overlay, badge pill, headline, description, CTA link
- Collections: "Everyday Essentials" (Curated Pantry), "Living & Decor" (Modern Architecture), "Under ₹499 Bazaar" (Super Saver Hub, bg-tertiary-container badge)

#### Section 5: Bestsellers & Top Trending
`<section class="max-w-[1440px] mx-auto w-full px-margin-sm lg:px-margin py-space-lg">`

- Header: "Bestsellers & Trending Now" + filter tabs (pill buttons: "All Trending" active `bg-on-surface text-surface-container-lowest`, others `bg-surface-container`)
- 4-column product grid (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter`)
- Product card structure:
  - `bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-md`
  - Image: `aspect-square rounded-lg bg-surface-container-low` with `group-hover:scale-105`
  - Badge: top-left (varies: "ORGANIC", "HOT DEAL", "BESTSELLER", "PURE BOTANICAL")
  - Wishlist button: top-right circular
  - Quick View overlay: `absolute bottom-2 inset-x-2 opacity-0 group-hover:opacity-100` with `visibility` icon + "Quick View"
  - Rating: star + number + count
  - Title (line-clamp-2) + subtitle (caption-micro)
  - Color swatches: `w-3.5 h-3.5 rounded-full` with `ring-1 ring-offset-1 ring-primary` on selected
  - Price: headline-sm bold + strikethrough MRP
  - Add to cart icon button: `w-9 h-9 rounded-lg bg-surface-container-high hover:bg-primary`

#### Section 6: Shop By Budget
`<section class="max-w-[1440px] mx-auto w-full px-margin-sm lg:px-margin py-space-lg">`

- Container: `bg-surface-container-low rounded-xl p-space-lg shadow-sm`
- Budget pill filters: "Under ₹299" (active bg-primary), "Under ₹499", "Under ₹999", "Premium Studio"
- 4 budget item cards in `grid grid-cols-2 md:grid-cols-4 gap-space-md`
- Each: compact card with image, tag badge, name (truncate), price, "Add for ₹X" button
- JS: `filterBudget()` function dynamically swaps card content based on selected budget tab

#### Section 7: Trust & Customer Confidence
`<section class="max-w-[1440px] mx-auto w-full px-margin-sm lg:px-margin py-space-lg mb-space-md">`

- `bg-surface-container rounded-xl p-space-lg lg:p-space-xl shadow-xs`
- 4-column grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-lg`)
- Each: icon in `w-12 h-12 rounded-xl bg-primary/10 text-primary` + headline + description
- Items: 100% Authentic (verified), Doorstep Try & Buy (checkroom), 7-Day Express Returns (published_with_changes), Carbon-Neutral Delivery (eco)

### Interactive Elements (Homepage)

1. **Deal Countdown Timer** (`id="deal-timer"`): JS IIFE counts down from 5h 22m 41s, updates every second
2. **Quick View Modal** (`id="quickview-modal"`): Fixed overlay `bg-inverse-surface/60 backdrop-blur-sm`, dialog `max-w-2xl` with scale transition. `openQuickView()` / `closeQuickView()` functions
3. **Cart Toast** (`id="cart-toast"`): Fixed bottom-right, `translate-y-20 opacity-0` hidden state, `showToast()` reveals for 3.2s
4. **Budget Filter** (`filterBudget()`): Swaps `#budget-cards-container` innerHTML based on `budgetCatalog` object
5. **Wishlist Toggle** (`toggleWishlist()`): Toggles `font-variation-settings: 'FILL' 1` and `text-error` class
6. **Add to Cart** (`handleAddToCart()`): Calls `showToast()` with item name
7. **Carousel dots**: Static (no auto-advance JS, just visual)

---

## 5. PAGE ANALYSIS: DESIGN 2 — PRODUCT DETAIL PAGE

### Body & Main

Same as homepage: `<main class="w-full pt-40 bg-surface min-h-[calc(100vh-160px)]">`

### Sections in Order

#### Section 1: Breadcrumb & Quick Actions Bar
`<section class="w-full bg-surface-container-lowest shadow-sm">`

- Breadcrumb: Home / Electronics / Audio / Over-Ear Headphones / "Loop SoundFlow Max" (font-semibold, truncate)
- Right side: Share button (`share` icon, bg-surface-container) + divider + "100% Authentic Product" (verified icon, text-tertiary)

#### Section 2: Main Product Detail Grid
`<section class="max-w-[1440px] mx-auto px-margin-sm lg:px-margin py-space-lg w-full">`

12-column grid (`grid-cols-1 lg:grid-cols-12 gap-gutter items-start`):

**Left Column — Media Gallery (lg:col-span-7)**: `flex flex-col-reverse md:flex-row gap-space-md lg:sticky lg:top-44`
- Vertical thumbnails: `flex md:flex-col gap-space-xs overflow-x-auto md:overflow-y-auto md:max-h-[560px]`, 5 thumbnails (`w-16 h-16 md:w-20 md:h-20 rounded-xl`). Active has `opacity-100`, inactive `opacity-70 hover:opacity-100`
- Hero image container: `relative flex-1 rounded-2xl bg-surface-container-lowest overflow-hidden shadow-md min-h-[420px] md:min-h-[580px]`
  - Floating badges: "52% OFF" (bg-error) + "#1 Bestseller in Audio" (bg-tertiary-container)
  - Wishlist button: `absolute top-4 right-4 w-11 h-11 rounded-full bg-surface-container-lowest/90 backdrop-blur-md`
  - Main image: `id="mainProductImg"` with zoom-on-hover (`cursor-crosshair`)
  - Zoom badge: "Roll over to inspect" (`zoom_in` icon)

**Right Column — Buy Box (lg:col-span-5)**: `flex flex-col gap-space-md`
- Store link: "Visit the Loop Acoustics Store" + verified icon + model number pill
- Title (font-headline-md)
- Rating: "4.8" + 5 stars (with `star_half` for half) + "3,842 ratings" link + "412 answered questions" + "1.2k+ bought last month" badge (bg-tertiary-fixed)
- **Pricing card**: `p-space-md rounded-2xl bg-surface-container-low shadow-sm`
  - Price: "₹4,499" (headline-xl extrabold) + strikethrough "₹9,499" + "Save ₹5,000 (52% OFF)" (bg-error-container text-error)
  - Tax note: "Inclusive of all central & state taxes. EMI starts at ₹750/month"
  - Bank offers: 2 offer cards (Flat ₹750 Off on HDFC/ICICI, No Cost EMI up to 6 months)
- **Color variant selector**: 4 circular buttons (`w-10 h-10 rounded-full`), active has `ring-4 ring-primary ring-offset-2` + check icon. Colors: Space Gray (bg-slate-700), Matte Black (bg-neutral-900), Midnight Blue (bg-sky-900), Desert Cream (bg-amber-100)
- **Edition/Configuration**: 2 radio-style cards (Standard ₹4,499, Traveler Case Bundle ₹4,998). Active has `radio_button_checked` icon
- **Pincode checker**: input (maxlength=6) + Check button + delivery info with countdown `id="countdownTimer"` ("2 hrs 14 mins 32 secs")
- **Stock/seller**: "In Stock — Only 14 units left" (text-emerald-600, pulse animation) + "Sold by Loop Retail Direct • Fulfilled by Loop Studio"
- **Quantity + CTAs**: Stepper (minus/plus buttons, qty display) + "Add to Cart" (bg-primary) + "Buy Now" (bg-on-surface)
- **Assurance icons**: 3 mini cards (7 Days Return, 1 Yr Warranty, Free Shipping)

#### Section 3: Feature Storytelling Cards
`<section class="w-full bg-surface-container-low py-space-xl my-space-lg shadow-inner">`

- Header: "Engineered For Immersion" (label-sm uppercase) + "Pure Sound, Zero Distraction" (headline-lg)
- 3 feature cards (`grid-cols-1 md:grid-cols-3 gap-gutter`):
  1. Hi-Res LDAC Wireless (graphic_eq icon) — "990 kbps bit rate transmission"
  2. 65-Hour Marathon Battery (battery_charging_full icon) — "USB-C Quick Fuel Enabled"
  3. Multipoint Seamless Pairing (devices icon) — "Dual Device Sync v5.3"

#### Section 4: Technical Specs + Frequently Bought Together
`<section class="max-w-[1440px] mx-auto px-margin-sm lg:px-margin py-space-lg w-full">`

12-column grid:
- **Specs table (lg:col-span-7)**: 8 rows in `divide-y divide-surface-container`, alternating bg. Fields: Acoustic Drivers, ANC Depth, Total Playtime, Bluetooth Architecture, Supported Codecs, Microphone Array, Physical Weight, Warranty
- **Frequently Bought Together (lg:col-span-5)**: 3 item thumbnails with `tv_displays` separators, checkboxes for each, bundle total "₹5,197" + "Add All 3 to Cart" button

#### Section 5: Customer Reviews
`<section class="w-full bg-surface-container-lowest py-space-xl my-space-lg shadow-sm" id="reviewsSection">`

Two columns (`flex flex-col lg:flex-row gap-gutter`):
- **Scorecard (lg:w-1/3)**: "4.8" (display-hero size), 5 stars, "Based on 3,842 global verified buyers", star distribution bars (5★: 82%, 4★: 12%, 3★: 4%, 2★: 1%, 1★: 1%), "Write a Verified Review" button
- **Review feed (lg:w-2/3)**: Customer photo strip (5 thumbnails + "+416 more"), filter pills (All Reviews, With Photos, ANC Quality, Battery Life), 2 review cards with avatar initials, verified badge, star rating, helpful count, "Read all 3,842 customer reviews" button

#### Section 6: Related Products
`<section class="max-w-[1440px] mx-auto px-margin-sm lg:px-margin py-space-lg w-full mb-space-xl">`

- Header: "You Might Also Like" + carousel arrows (arrow_back/arrow_forward buttons)
- 4 product cards (`grid-cols-2 md:grid-cols-4 gap-gutter`): image, badge, brand, title (line-clamp-2), rating, price, "Add" button

### Interactive Elements (Product Detail)

1. **Thumbnail switcher**: Clicking thumbnail updates `#mainProductImg` src
2. **Zoom on hover**: `mousemove` on `#imageStage` sets `transformOrigin` and `scale(1.4)`, `mouseleave` resets
3. **Quantity stepper**: Minus/plus buttons, qty 1-9
4. **Color selector**: Clicking sets active ring + check icon, updates `#selectedColorName`
5. **Wishlist toggle**: Toggles `favorite_border` ↔ `favorite` (filled, text-error)
6. **Pincode checker**: Validates 6 digits, shows check_circle (emerald) or error icon
7. **Countdown timer**: Counts down from 2h 14m 32s for delivery cutoff
8. **Add to Cart animation**: Button text changes to "Added to Bag" + bg-emerald-600 for 1.8s

---

## 6. PAGE ANALYSIS: DESIGN 3 — CATEGORY/LISTING PAGE

### Body & Main

Same as other pages: `<main class="w-full pt-40 bg-surface min-h-[calc(100vh-160px)]">`

### Sections in Order

#### Section 1: Breadcrumb & Trust Ticker
`<div class="w-full bg-surface-container-low py-space-xs px-margin-sm lg:px-margin">`

- Breadcrumb: Home (home icon) / Electronics / Audio & Wearables / "Headphones & Earphones" (active, font-label-sm semibold)
- Trust pill (hidden md:flex): "100% Brand Authenticity Guaranteed" (verified icon) + "Instant 7-Day Returns"

#### Section 2: Category Headline & Promo Banner
`<section class="max-w-[1440px] mx-auto w-full px-margin-sm lg:px-margin pt-space-lg pb-space-md">`

- Left: "CURATED AUDIO LAB" pill (headphones icon) + "Headphones & Audio Essentials" (headline-xl) + description
- Right: Promo banner — gradient `from-primary via-primary-container to-surface-tint`, "Audio Carnival" / "Extra 10% Off Studio Series" / code "HARMONY10", `tune` icon in circle

#### Section 3: Main Content (Sidebar + Catalog)
`<div class="max-w-[1440px] mx-auto w-full px-margin-sm lg:px-margin pb-space-xl">`

`flex flex-col lg:flex-row items-start gap-space-lg`:

**Sidebar Filters (lg:w-[280px], lg:sticky lg:top-44)**:

1. **Active Filter Chips**: "Applied Filters" header + Clear All button + removable chips ("Noise Canceling", "Under ₹5,000", "4★ & Above")
2. **In-Stock Toggle**: Switch (peer-checked toggle) for "In Stock Only"
3. **Price Range**: Dual track visual + min/max number inputs (₹500 to ₹25000) + Apply button
4. **Brand checkboxes**: Loop Acoustics (18), Sony (12), Bose (8), Sennheiser (14), boAt (22), Marshall (6) — each with count badge
5. **Customer Rating**: Radio buttons (4.0+, 3.0+, 2.0+)
6. **Connectivity**: Checkboxes (Bluetooth 5.3/5.4, True Wireless, Wired 3.5mm, Type-C DAC)
7. **Key Acoustic Features**: Checkboxes (ANC, Transparency Mode, Waterproof IPX5+, Multipoint)
8. **Discount Minimum**: Checkboxes (50%+, 40%+, 30%+, 20%+)

**Catalog Main Pane (flex-1)**:

- **Top controls bar**: "Showing 48 of 214 products" + delivery location + view mode switcher (grid_view / view_list icons) + sort dropdown (Featured, Price Low-High, Price High-Low, Rating, Newest, Highest Discount)
- **Product grid**: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-space-md` — 8 product cards
- **Product card structure** (more detailed than homepage):
  - Image area: `aspect-square bg-surface-container-low`, `group-hover:scale-105`
  - Badges: discount (bg-error) + optional secondary (BESTSELLER bg-surface-tint, DEAL OF DAY bg-tertiary-container, NEW bg-secondary-fixed)
  - Wishlist: top-right circular
  - Content: brand name (uppercase tracking-wider) + color swatches (3 small circles) + title (headline-sm, line-clamp-2) + rating
  - Delivery pill: "Get it by Tomorrow, 2 PM" (local_shipping/bolt icon, bg-surface-container-low)
  - Price: headline-md bold + strikethrough
  - Add to Cart: `w-full bg-primary` with shopping_bag icon

- **Bottom controls**: Progress bar "Viewed 48 of 214 items (22%)" + "Load Next 24 Products" button + numbered pagination (1 active, 2, 3, ..., 9, chevron arrows)

### Interactive Elements (Category Page)

1. **Wishlist toggle** (`toggleWishlist()`): Same fill toggle as other pages
2. **Clear filters** (`clearAllFilters()`): Empties `#active-filter-chips`
3. **Grid/List view toggle**: Swaps `#product-grid` className between 4-col grid and 1-col list
4. **Sort dropdown**: Native select element
5. **Load More button**: Static (no JS handler)
6. **Pagination**: Static buttons

### Responsive Behavior

- Sidebar: `w-full` on mobile (stacks above), `lg:w-[280px]` on desktop, `lg:sticky lg:top-44`
- Product grid: 1 col mobile → 2 col sm → 3 col lg → 4 col xl
- Trust pill: `hidden md:flex`
- Sort label: `hidden md:inline`

---

## 7. PAGE ANALYSIS: DESIGN 4 — CHECKOUT PAGE

### Key Difference: NO full header, NO footer

This page uses a **minimal header** and has no footer at all.

### Body

```
<body class="bg-surface min-h-screen flex items-center justify-center font-body-md text-on-surface antialiased">
<main class="w-full">
```

### Sections in Order

#### Section 1: Minimal Secure Top Navigation
`<header class="w-full bg-surface-container-lowest shadow-sm">`

```
<div class="max-w-[1440px] mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
```

- **Left**: Logo only (`<img>` h-8 md:h-10). NO "Loop Studio" text, NO search, NO nav links
- **Right**: Trust badge "256-Bit SSL Encrypted Checkout" (verified_user icon, `hidden sm:inline` full text, `sm:hidden` shows just "Secure") + "24/7 Priority Support" link (support_agent icon, `hidden md:inline` text)

#### Section 2: Progress Stepper
`<div class="w-full bg-surface-container-low py-4 px-4 sm:px-8">`

4-step horizontal stepper:
1. **Delivery Address** — complete (check icon in filled circle, bg-primary)
2. **Review & Delivery** — active (number "2" in bg-primary-container with ring-4 ring-primary-fixed/50, bold text-primary)
3. **Payment** — inactive (number "3" in bg-surface-container-highest, text-on-surface-variant)
4. **Confirmation** — inactive (number "4" in bg-surface-container-highest, text-secondary)

Connector lines between steps: completed = `bg-primary/40`, pending = `bg-outline-variant`
Labels: `hidden sm:inline` (hidden on mobile, shown ≥640px)

#### Section 3: Primary Checkout Grid
`<div class="max-w-[1440px] mx-auto w-full px-4 sm:px-8 py-8 md:py-10">`

`grid grid-cols-1 lg:grid-cols-12 gap-8 items-start`:

**Left Column — Forms (lg:col-span-8)**:

1. **Delivery Address** card:
   - Header: location_on icon + "Delivery Address" + "Add New Address" button
   - Selected address card: radio (checked) + name "Priya Sharma" + "Default" badge (bg-primary/10) + "Home" badge (bg-secondary-container) + full address + phone + "Edit Address" button

2. **Shipping Speed** card:
   - 2 options in `grid-cols-1 md:grid-cols-2 gap-4`:
   - Standard Courier: FREE, "Friday, 18 Oct (2-3 business days)"
   - Loop Express Priority (pre-selected, RECOMMENDED badge): "Tomorrow by 11:00 AM", FREE (strikethrough ₹49)

3. **Payment Method** card:
   - Accordion with 5 options (radio + expandable content):
   - **A: UPI / Instant Pay** (active default, "FASTEST" badge): UPI ID input + Verify button + QR scan option
   - **B: Credit / Debit Card**: Card number, expiry, CVV, name, save card checkbox
   - **C: Net Banking**: Popular banks grid (HDFC, ICICI, SBI, Axis)
   - **D: Loop Wallet / Credits**: "Available Balance: ₹500.00" + Apply button
   - **E: Cash / Pay on Delivery**: OTP verification note

4. **Purchase CTA**:
   - "Place Order & Pay ₹6,415" button (`h-14 bg-primary text-on-primary font-headline-sm rounded-xl shadow-lg`) with lock icon + arrow_forward
   - Safe shopping badges: Loop Buyer Protection, 7-Day Returns, Bank-grade Encryption

**Right Column — Order Summary (lg:col-span-4, sticky top-6)**:

1. **Order Summary** card:
   - Header: "Order Summary" + "3 items" badge + "Edit Bag" link
   - 3 product rows: thumbnail (w-16 h-16) + name (truncate) + variant/qty + price
   - Promo code applied: "LOOP15" (15% discount) with remove button
   - Price breakdown: Subtotal ₹7,547, Discount -₹1,132, Delivery FREE, Taxes Included
   - Total: "₹6,415" (headline-lg, text-primary) + "You saved ₹1,181"

2. **Trust badges**: Loop Buyer Guarantee (verified) + Doorstep Exchanges (sync)

### Interactive Elements (Checkout)

1. **Payment accordion** (`togglePaymentTab()`): Shows/hides content divs for each payment method. UPI is expanded by default.
2. **Payment simulation** (`simulatePayment()`): Button states cycle: "Connecting to Secure Gateway..." → "Authorizing ₹6,415..." → "Order Confirmed! Redirecting..." (changes bg to bg-tertiary)
3. **UPI Verify button**: Static (no handler)

### Responsive Behavior

- Grid: single column mobile → 8/4 split on lg
- Stepper labels: `hidden sm:inline`
- Trust text: "256-Bit SSL Encrypted Checkout" → "Secure" on mobile
- Support text: `hidden md:inline`
- Shipping options: stack on mobile, 2-col on md+

---

## 8. KEY DIFFERENCES FROM EXISTING APPLICATION

### Icon System

| Aspect | Design Files | Existing App |
|---|---|---|
| Icon library | **Material Symbols Outlined** (Google Fonts) | **lucide-react** |
| Usage | `<span class="material-symbols-outlined">icon_name</span>` | `<IconName />` React components |
| Fill state | Controlled via `font-variation-settings: 'FILL' 1` | Controlled via `fill` prop |
| Sizing | Tailwind text-size classes (`text-sm`, `text-2xl`, etc.) | `size` prop or className |

**Migration note**: Every `material-symbols-outlined` span needs mapping to a lucide-react equivalent. Key icons used:
`local_shipping`, `location_on`, `language`, `pin_drop`, `keyboard_arrow_down`, `arrow_drop_down`, `search`, `close`, `favorite`, `favorite_border`, `shopping_cart`, `shopping_bag`, `add_shopping_cart`, `shopping_basket`, `expand_more`, `menu`, `light_mode`, `bolt`, `credit_card`, `arrow_forward`, `star`, `star_half`, `timer`, `verified`, `verified_user`, `checkroom`, `published_with_changes`, `eco`, `sync`, `lock`, `headset_mic`, `visibility`, `check`, `check_circle`, `error`, `add`, `remove`, `share`, `local_fire_department`, `award_star`, `receipt`, `local_offer`, `percent`, `location_on`, `graphic_eq`, `battery_charging_full`, `devices`, `tune`, `filter_list`, `inventory_2`, `grid_view`, `view_list`, `chevron_left`, `chevron_right`, `chevron_right`, `expand_more`, `home`, `headphones`, `qr_code_2`, `account_balance_wallet`, `payments`, `loyalty`, `support_agent`, `arrow_back`, `thumb_up`, `radio_button_checked`, `radio_button_unchecked`, `tv_displays`

### Image Handling

- Designs use `data-alt` custom attribute instead of standard `alt` — these are Google AI-generated image placeholders
- All images are Google-hosted URLs (`lh3.googleusercontent.com/aida-public/...`)
- Background images use inline `style="background-image: url(...)"` extensively
- Product images use `bg-cover bg-center` divs, not `<img>` tags (except PDP gallery and related products)

### CSS Approach

- Designs use **CDN Tailwind** (`cdn.tailwindcss.com`) with inline config script
- Existing app uses **Tailwind CSS v4** with app-level config
- Custom tokens (colors, fonts, spacing) need to be ported to the app's Tailwind config

### Font Loading

- Designs load Inter + Plus Jakarta Sans + Material Symbols from Google Fonts
- Existing app likely loads fonts differently (Next.js font optimization)

### Dark Mode

- Config has `darkMode: "class"` but no dark mode styles are implemented in the designs
- Theme toggle button exists but has no JS handler

### JavaScript Patterns

- All interactivity is vanilla JS (inline `<script>` tags)
- No framework (React/Next.js) patterns
- Functions are global (`handleAddToCart`, `toggleWishlist`, `openQuickView`, `filterBudget`, `togglePaymentTab`, `simulatePayment`)
- These need conversion to React hooks/handlers

### Structural Differences

| Element | Design | Existing App (expected) |
|---|---|---|
| Header | 160px fixed, 3-row marketplace header | Likely simpler |
| Footer | Full 6-column marketplace footer | May not exist yet |
| Checkout | Minimal header, no footer, 4-step stepper | Standard layout |
| Product cards | Material Design tokens, data-alt images | lucide icons, next/image |
| Modals | Quick View modal with scale transition | React dialog component |

### Unique to Designs (Not in Typical E-commerce)

- "Under ₹499 Bazaar" as a highlighted nav category (tertiary color)
- "Today's Deals" in error/red color in nav
- Progress bars showing "Claimed: X%" on deal cards
- Quick View modal on product hover
- Budget filter tabs with dynamic content swap
- Pincode checker with countdown timer
- Bundle/frequently-bought-together with checkbox selection
- Star distribution bars in reviews
- Customer photo gallery in reviews
- Glassmorphism promo tags (backdrop-blur)
