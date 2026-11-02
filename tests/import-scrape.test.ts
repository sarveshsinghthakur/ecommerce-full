import { describe, expect, it } from "vitest";
import {
  decodeEntities,
  detectProvider,
  isForbiddenHost,
  normalizePrice,
  normalizeSourceUrl,
  parseProductHtml,
  stripTags,
  validateImportUrl,
} from "@/lib/import/scrape";

const PAGE_URL = new URL("https://www.example-store.com/products/cotton-kurta");

const FIXTURE_JSON_LD = `<!DOCTYPE html><html><head>
  <title>Cotton Kurta | Example Store</title>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Cotton Anarkali Kurta",
    "description": "<p>Hand-block printed cotton kurta.</p>",
    "brand": { "@type": "Brand", "name": "Loop Studio Essentials" },
    "image": ["https://cdn.example-store.com/kurta-1.jpg", "https://cdn.example-store.com/kurta-2.jpg"],
    "sku": "KRT-101",
    "offers": {
      "@type": "Offer",
      "price": "1299.00",
      "priceCurrency": "INR",
      "availability": "https://schema.org/InStock"
    },
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.3", "reviewCount": "128" }
  }
  </script>
</head><body></body></html>`;

const FIXTURE_OG = `<!DOCTYPE html><html><head>
  <meta property="og:title" content="Wireless Earbuds Pro" />
  <meta property="og:description" content="40-hour battery life ANC earbuds" />
  <meta property="og:image" content="/images/earbuds.png" />
  <meta property="og:site_name" content="AudioHub" />
  <meta property="product:price:amount" content="2,499.00" />
  <meta property="product:price:currency" content="INR" />
  <meta property="product:mrp" content="4999" />
</head><body><h1>Wireless Earbuds Pro</h1></body></html>`;

const FIXTURE_BLOCKED = `<!DOCTYPE html><html><head><title>Access Denied</title></head>
<body><h1>Access Denied</h1><p>Automated requests from your computer network are blocked.</p></body></html>`;

describe("parseProductHtml", () => {
  it("extracts a full product from JSON-LD (highest-trust source)", () => {
    const outcome = parseProductHtml(FIXTURE_JSON_LD, PAGE_URL);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.preview.title).toBe("Cotton Anarkali Kurta");
    expect(outcome.preview.brand).toBe("Loop Studio Essentials");
    expect(outcome.preview.sourcePrice).toBe("1299.00");
    expect(outcome.preview.currency).toBe("INR");
    expect(outcome.preview.images).toHaveLength(2);
    expect(outcome.preview.rating).toBe("4.30");
    expect(outcome.preview.reviewCount).toBe(128);
    expect(outcome.preview.availability).toBe("in_stock");
    expect(outcome.preview.sku).toBe("KRT-101");
    expect(outcome.missingFields).toHaveLength(0);
  });

  it("falls back to Open Graph meta and normalizes prices", () => {
    const outcome = parseProductHtml(FIXTURE_OG, new URL("https://www.audiohub.com/p/1"));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.preview.title).toBe("Wireless Earbuds Pro");
    expect(outcome.preview.sourcePrice).toBe("2499.00");
    expect(outcome.preview.referencePrice).toBe("4999.00");
    expect(outcome.preview.brand).toBe("AudioHub");
    // relative image URL is absolutized against the page URL
    expect(outcome.preview.images[0]).toBe("https://www.audiohub.com/images/earbuds.png");
  });

  it("detects bot-blocked pages and returns a structured outcome", () => {
    const outcome = parseProductHtml(FIXTURE_BLOCKED, new URL("https://www.meesho.com/x/p/1"));
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.code).toBe("blocked");
    expect(outcome.provider).toBe("meesho");
    expect(outcome.message).toContain("copy the title, price");
  });

  it("flags missing fields instead of inventing data", () => {
    const html = `<html><head><meta property="og:title" content="Mystery Item"></head><body></body></html>`;
    const outcome = parseProductHtml(html, PAGE_URL);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.preview.sourcePrice).toBeNull();
    expect(outcome.missingFields).toContain("price");
    expect(outcome.missingFields).toContain("images");
  });
});

describe("price helpers", () => {
  it("normalizes Indian and Western price formats", () => {
    expect(normalizePrice("₹1,299.00")).toBe("1299.00");
    expect(normalizePrice("Rs. 499")).toBe("499.00");
    expect(normalizePrice("1,29,999")).toBe("129999.00");
    expect(normalizePrice("MRP: 899")).toBe("899.00");
    expect(normalizePrice("free")).toBeNull();
    expect(normalizePrice("₹0")).toBeNull();
    expect(normalizePrice(null)).toBeNull();
  });
});

describe("url guards", () => {
  it("rejects private and non-http addresses (SSRF guard)", () => {
    expect(validateImportUrl("http://localhost/admin")).toBeNull();
    expect(validateImportUrl("http://192.168.1.5/p/1")).toBeNull();
    expect(validateImportUrl("http://169.254.169.254/latest/meta-data")).toBeNull();
    expect(validateImportUrl("file:///etc/passwd")).toBeNull();
    expect(validateImportUrl("ftp://example.com/x")).toBeNull();
    expect(validateImportUrl("https://www.meesho.com/x/p/abc")).not.toBeNull();
    expect(isForbiddenHost("10.0.0.8")).toBe(true);
    expect(isForbiddenHost("172.20.1.1")).toBe(true);
    expect(isForbiddenHost("172.32.0.1")).toBe(false);
  });

  it("normalizes source URLs for duplicate detection", () => {
    expect(
      normalizeSourceUrl("https://Shop.example.com/p/abc/?utm_source=me&ref=home#top"),
    ).toBe("shop.example.com/p/abc");
    expect(normalizeSourceUrl("https://x.com/p/1?color=red")).toBe("x.com/p/1?color=red");
  });
});

describe("misc helpers", () => {
  it("detects providers from hostname", () => {
    expect(detectProvider("www.meesho.com")).toBe("meesho");
    expect(detectProvider("https://www.flipkart.com/p/1")).toBe("flipkart");
    expect(detectProvider("shop.mysite.com")).toBe("shop.mysite.com");
  });

  it("decodes entities and strips tags", () => {
    expect(decodeEntities("a &amp; b &#x20B9;500")).toBe("a & b ₹500");
    expect(stripTags("<p>Hello <b>World</b></p>")).toBe("Hello World");
  });
});
