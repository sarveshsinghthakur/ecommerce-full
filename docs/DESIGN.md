# Aurora Store — Modern Minimalist Retail Design System

## 1. Visual Direction & Principles
- **Aesthetic:** Modern minimalist retail design with a premium editorial feel.
- **Surfaces:** Clean light neutral background (`#fcfcfd`), crisp white cards (`#ffffff`), subtle borders (`#e2e8f0` / `#cbd5e1`), and soft diffuse elevation.
- **Typography:** 
  - Display/Headlines: Inter & Plus Jakarta Sans with tight tracking (`-0.02em` to `-0.03em`).
  - Body: Inter for neutral, high-legibility readability.
  - Pricing & Monospace Data: Tabular numbers with clear currency symbols (`₹`).
- **Color Philosophy:**
  - Dominant Neutral: Charcoal / Slate (`#0f172a`) for crisp readability against light backgrounds.
  - Primary Accent: Obsidian Black (`#111827`) with subtle Indigo/Cyan active state highlights (`#2563eb`).
  - Warm/Status Accents: Emerald (`#10b981`) for in-stock and success; Amber (`#f59e0b`) for low stock/alerts; Rose (`#e11d48`) for discounts/sale badges and errors.
- **Whitespace & Layout:** Generous breathing room, 8pt spatial grid, uncluttered product showcase where photography is the hero.
- **Dark Mode:** Refined deep charcoal (`#090d16` base canvas, `#111827` surface container, `#1e293b` borders, `#f8fafc` primary text) with zero visual jarring and persistent user preference.

---

## 2. Design Tokens

### Color Palette (Light Mode)
```css
:root {
  --bg-canvas: #fcfcfd;
  --bg-surface: #ffffff;
  --bg-subtle: #f8fafc;
  --bg-muted: #f1f5f9;
  
  --border-subtle: #e2e8f0;
  --border-medium: #cbd5e1;
  --border-strong: #94a3b8;
  
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #64748b;
  --text-disabled: #94a3b8;
  
  --accent-primary: #0f172a;
  --accent-primary-hover: #1e293b;
  --accent-primary-fg: #ffffff;
  
  --accent-highlight: #2563eb;
  --accent-highlight-subtle: #eff6ff;
  
  --status-success: #059669;
  --status-success-bg: #ecfdf5;
  --status-warning: #d97706;
  --status-warning-bg: #fffbeb;
  --status-danger: #e11d48;
  --status-danger-bg: #fff1f2;
}
```

### Color Palette (Dark Mode)
```css
.dark {
  --bg-canvas: #090d16;
  --bg-surface: #111827;
  --bg-subtle: #161f30;
  --bg-muted: #1e293b;
  
  --border-subtle: #1e293b;
  --border-medium: #334155;
  --border-strong: #475569;
  
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;
  --text-disabled: #64748b;
  
  --accent-primary: #f8fafc;
  --accent-primary-hover: #e2e8f0;
  --accent-primary-fg: #0f172a;
  
  --accent-highlight: #3b82f6;
  --accent-highlight-subtle: #1e3a8a33;
  
  --status-success: #10b981;
  --status-success-bg: #064e3b33;
  --status-warning: #f59e0b;
  --status-warning-bg: #78350f33;
  --status-danger: #f43f5e;
  --status-danger-bg: #88133733;
}
```

### Typography Scale
- **Display Hero:** 48px - 56px / Line Height 1.1 / Weight 800 / Tracking -0.03em
- **Headline 1:** 36px - 40px / Line Height 1.15 / Weight 700 / Tracking -0.025em
- **Headline 2:** 28px - 32px / Line Height 1.2 / Weight 700 / Tracking -0.02em
- **Headline 3:** 20px - 24px / Line Height 1.3 / Weight 600 / Tracking -0.015em
- **Body Large:** 18px / Line Height 1.6 / Weight 400
- **Body Medium:** 15px / Line Height 1.55 / Weight 400
- **Body Small:** 13px / Line Height 1.5 / Weight 400
- **Caption / Overline:** 11px / Line Height 1.4 / Weight 600 / Tracking 0.08em uppercase

---

## 3. Screen Specifications & Hierarchy

### 1. Storefront Home
- **Announcement Bar:** Subtle top ticker (free shipping above ₹999, instant Paytm checkout).
- **Header:** Sticky, backdrop-blur 12px, brand mark, category navigation dropdowns, search trigger, wishlist indicator, cart drawer trigger with item badge, user profile/auth avatar.
- **Hero:** Refined editorial banner showcasing flagship products with clean CTA buttons.
- **Category Rails:** Visual category cards with clean imagery and typography.
- **Featured Collection:** 4-column responsive grid (desktop), 2-column (tablet/mobile).
- **Trust Elements:** Secure checkout, fast delivery, authentic products, easy returns.
- **Footer:** Editorial footer with customer service links, policy pages, newsletter signup, and copyright.

### 2. Product Listing & Search Pages
- Filter sidebar (desktop) / Drawer (mobile) with Category, Brand, Price Range slider/inputs, Availability.
- Sort selector (Price: Low to High, Price: High to Low, Rating, Newest).
- Clean Product Cards:
  - 1:1 consistent aspect ratio container.
  - Image fallback and skeleton loading.
  - Subtle discount badge (`-25%`).
  - Brand name overline.
  - High-contrast product title (truncated gracefully at 2 lines).
  - Price display: Current price bold, struck-through original price, savings badge.
  - Quick "Add to Cart" and Wishlist heart button.

### 3. Product Details Page (PDP)
- Responsive split layout: Left sticky image gallery with thumbnail rail; Right purchase panel.
- Product title, brand, rating with star indicators, review count.
- Price with savings breakdown and GST inclusive notice.
- Stock availability indicator (e.g. "In Stock" with green pulse dot).
- Quantity selector (+ / - stepper).
- Primary "Add to Cart" and secondary "Buy Now with Paytm" actions.
- Collapsible accordion for Product Specifications, Shipping Details, and Return Policy.
- Verified customer reviews list with star rating distribution.

### 4. Cart Drawer & Cart Page
- Slide-over drawer accessible from any page.
- Item list with product thumbnail, title, selected variant, quantity stepper, price, and remove button.
- Subtotal, estimated shipping calculation, savings summary.
- Seamless "Proceed to Checkout" button.

### 5. Checkout Flow
- Clean single-page or two-step checkout:
  - Step 1: Shipping Address (Saved addresses for authenticated users or clean address form).
  - Step 2: Payment Method (Paytm Payment Gateway with UPI, NetBanking, Debit/Credit Cards).
- Order summary card with line items, tax, delivery fee, and total payable amount.
- Security badge highlighting Paytm SSL encryption and zero card details stored.

### 6. Paytm Payment States
- **Initiating:** Polished loader redirecting to Paytm Gateway.
- **Verifying / Pending:** Authoritative polling modal awaiting backend webhook confirmation.
- **Success:** Order confirmation screen with order reference number, invoice download, items purchased summary, and delivery tracking roadmap.
- **Failed / Cancelled:** Empathetic failure state with clear explanation, retry button, and support contact.

### 7. Customer Dashboard & Orders
- Profile summary with name, email, Google Auth indicator.
- Address book with Add / Edit / Set Default capabilities.
- Order History list with status badges (`PENDING`, `PAID`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`).
- Order details breakdown with item snapshots, shipping destination, and transaction reference.

---

## 4. Accessibility & Micro-Interactions
- Minimum touch targets of 44x44px on mobile.
- Focus rings visible for keyboard navigation (`outline: 2px solid var(--accent-highlight)`).
- WCAG AA contrast ratio compliant (minimum 4.5:1 for body copy, 3:1 for large text).
- Smooth CSS transitions (`transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1)`).
- Zero layout shift during image load using CSS aspect-ratio wrappers.
