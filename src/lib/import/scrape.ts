import "server-only";

/**
 * Product-page importer.
 *
 * Fetches an external product page (Meesho, Flipkart, Shopify stores, brand
 * sites, …) server-side and normalises whatever product data the page
 * publishes into a preview the admin can review before it becomes a catalog
 * row. Extraction is layered, most-trusted source first:
 *
 *   1. schema.org JSON-LD (`Product` + `Offer`) — what search engines read.
 *   2. Open Graph / `product:price:*` meta tags — what social crawlers read.
 *   3. Twitter card tags, then the bare `<title>` — last-resort hints.
 *
 * Marketplace bot protection (Meesho, Amazon, …) refuses server-side
 * fetches; that is surfaced as a structured `blocked` outcome so the UI can
 * fall back to the manual form instead of failing silently.
 *
 * Deliberately dependency-free: parsing is regex/JSON over the HTML text,
 * which keeps the build identical to the deployed runtime and avoids a DOM
 * implementation for what is ultimately a handful of tag reads.
 */

export type ScrapeErrorCode =
  | "invalid_url"
  | "blocked"
  | "fetch_failed"
  | "no_data"
  | "too_large";

export interface ScrapePreview {
  provider: string;
  siteName: string | null;
  /** Final URL after redirects — what actually got parsed. */
  url: string;
  title: string | null;
  description: string | null;
  brand: string | null;
  /** Normalized decimal string, e.g. "1299.00". */
  sourcePrice: string | null;
  /** Reference/MRP when the page published one distinct from the price. */
  referencePrice: string | null;
  currency: string;
  images: string[];
  rating: string | null;
  reviewCount: number | null;
  availability: "in_stock" | "out_of_stock" | "preorder" | "unknown";
  sku: string | null;
}

export type ScrapeOutcome =
  | {
      ok: true;
      preview: ScrapePreview;
      warnings: string[];
      missingFields: string[];
    }
  | { ok: false; code: ScrapeErrorCode; message: string; provider: string };

/* -------------------------------------------------------------------------- */
/* URL guards                                                                  */
/* -------------------------------------------------------------------------- */

/** SSRF guard: refuse addresses that resolve into private/loopback space. */
export function isForbiddenHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host.startsWith("[") // IPv6 literals, e.g. [::1]
  ) {
    return true;
  }
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      (a === 169 && b === 254) || // link-local / cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  return false;
}

export function validateImportUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (isForbiddenHost(url.hostname)) return null;
  return url;
}

/** Canonical key for duplicate detection in `source_listings`. */
export function normalizeSourceUrl(raw: string): string {
  const url = new URL(raw);
  url.hash = "";
  const drop = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid", "ref", "ref_src"];
  for (const key of [...url.searchParams.keys()]) {
    if (drop.includes(key.toLowerCase())) url.searchParams.delete(key);
  }
  const params = url.searchParams.toString();
  const path = url.pathname.replace(/\/+$/, "");
  return `${url.hostname.toLowerCase()}${path}${params ? `?${params}` : ""}`;
}

const PROVIDER_PATTERNS: Array<[RegExp, string]> = [
  [/meesho\.com$/i, "meesho"],
  [/flipkart\.com$/i, "flipkart"],
  [/amazon\.(in|com|ae|co\.uk)$/i, "amazon"],
  [/ajio\.com$/i, "ajio"],
  [/myntra\.com$/i, "myntra"],
  [/snapdeal\.com$/i, "snapdeal"],
  [/nykaa\.com$/i, "nykaa"],
  [/shopify/i, "shopify"],
  [/ebay\.[a-z.]+$/i, "ebay"],
];

export function detectProvider(hostnameOrUrl: string, htmlHint = ""): string {
  let host = hostnameOrUrl;
  try {
    host = new URL(hostnameOrUrl).hostname;
  } catch {
    /* already a bare hostname */
  }
  host = host.replace(/^www\./i, "");
  for (const [pattern, name] of PROVIDER_PATTERNS) {
    if (pattern.test(host) || pattern.test(htmlHint)) return name;
  }
  return host || "web";
}

/* -------------------------------------------------------------------------- */
/* Small HTML helpers                                                          */
/* -------------------------------------------------------------------------- */

const NAMED_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&rsquo;": "’",
  "&lsquo;": "‘",
  "&rdquo;": "”",
  "&ldquo;": "“",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
  "&#x20B9;": "₹",
  "&#8377;": "₹",
};

export function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&[a-z]+;/gi, (match) => NAMED_ENTITIES[match] ?? match);
}

/** Collapses tags/whitespace and decodes entities for a plain-text snippet. */
export function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

const META_CONTENT_FIRST =
  /<meta\b[^>]*\bcontent\s*=\s*["']([^"']*)["'][^>]*\b(?:property|name)\s*=\s*["']([^"']+)["'][^>]*>/gi;
const META_PROPERTY_FIRST =
  /<meta\b[^>]*\b(?:property|name)\s*=\s*["']([^"']+)["'][^>]*\bcontent\s*=\s*["']([^"']*)["'][^>]*>/gi;

/** Collects `<meta property|name content>` into a case-insensitive map. */
export function collectMeta(html: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const push = (key: string, value: string) => {
    const k = key.toLowerCase();
    const list = map.get(k) ?? [];
    list.push(value);
    map.set(k, list);
  };
  for (const m of html.matchAll(META_CONTENT_FIRST)) {
    const [content, key] = [m[1], m[2]];
    if (content != null && key != null) push(key, decodeEntities(content));
  }
  for (const m of html.matchAll(META_PROPERTY_FIRST)) {
    const [key, content] = [m[1], m[2]];
    if (content != null && key != null) push(key, decodeEntities(content));
  }
  return map;
}

function metaFirst(meta: Map<string, string[]>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = meta.get(key)?.find((v) => v.trim().length > 0);
    if (value) return value.trim();
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Price / number normalization                                                */
/* -------------------------------------------------------------------------- */

/** "₹1,299.00" / "MRP: 1299" / "1 299,00 ₹" → "1299.00"; null when unclear. */
export function normalizePrice(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = decodeEntities(raw)
    .replace(/[₹€$£\s]/g, "")
    .replace(/(?:Rs\.?|INR|USD|EUR|GBP)/gi, "")
    .replace(/MRP|Price|MRP[:]?/gi, "")
    .replace(/[^\d.,-]/g, "");
  if (!cleaned) return null;
  // Indian grouping (1,29,999) and Western grouping (1,299.99) both collapse
  // once separators are removed; the value was already currency-qualified.
  const digits = cleaned.replace(/,/g, "");
  const value = Number(digits);
  if (!Number.isFinite(value) || value <= 0 || value > 100_000_000) return null;
  return value.toFixed(2);
}

function normalizeRating(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = Number(String(raw).replace(/[^\d.]/g, ""));
  if (!Number.isFinite(value) || value < 0 || value > 5) return null;
  return value.toFixed(2);
}

function normalizeReviewCount(raw: unknown): number | null {
  if (raw == null) return null;
  const digits = String(raw).replace(/[^\d]/g, "");
  const value = Number(digits);
  return Number.isFinite(value) && value >= 0 ? Math.min(value, 10_000_000) : null;
}

const SCHEMA_AVAILABILITY: Array<[RegExp, ScrapePreview["availability"]]> = [
  [/instock|in_stock|https?:\/\/schema\.org\/instock/i, "in_stock"],
  [/outofstock|out_of_stock|soldout/i, "out_of_stock"],
  [/preorder|preorder/i, "preorder"],
];

function mapAvailability(raw: string | null | undefined): ScrapePreview["availability"] {
  if (!raw) return "unknown";
  for (const [pattern, value] of SCHEMA_AVAILABILITY) {
    if (pattern.test(raw)) return value;
  }
  return "unknown";
}

/* -------------------------------------------------------------------------- */
/* Image handling                                                              */
/* -------------------------------------------------------------------------- */

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif)(\?|#|$)/i;
const NON_PRODUCT_IMAGE = /(?:favicon|sprite|logo|icon|placeholder|pixel|tracking|badge)/i;

export function absolutizeUrl(raw: string, base: URL): string | null {
  try {
    const url = new URL(raw.trim(), base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function collectImages(
  candidates: Array<string | { url?: string }>,
  base: URL,
  out: Set<string>,
): void {
  for (const candidate of candidates) {
    const raw = typeof candidate === "string" ? candidate : candidate?.url;
    if (!raw || typeof raw !== "string") continue;
    if (raw.startsWith("data:")) continue;
    if (NON_PRODUCT_IMAGE.test(raw)) continue;
    if (!IMAGE_EXT.test(raw) && out.size > 0) continue; // first image may be extensionless
    const absolute = absolutizeUrl(raw, base);
    if (absolute) out.add(absolute);
    if (out.size >= 10) return;
  }
}

/* -------------------------------------------------------------------------- */
/* JSON-LD extraction                                                          */
/* -------------------------------------------------------------------------- */

const JSON_LD_BLOCK =
  /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

interface ProductNode {
  "@type"?: string | string[];
  name?: string;
  description?: string;
  brand?: string | { name?: string };
  image?: string | string[] | Array<{ url?: string }>;
  sku?: string;
  mpn?: string;
  offers?: OfferNode | OfferNode[];
  aggregateRating?: { ratingValue?: unknown; reviewCount?: unknown; ratingCount?: unknown };
}

interface OfferNode {
  price?: unknown;
  lowPrice?: unknown;
  highPrice?: unknown;
  priceCurrency?: string;
  availability?: string;
  url?: string;
}

function flattenJsonLd(value: unknown, out: ProductNode[]): void {
  if (Array.isArray(value)) {
    for (const entry of value) flattenJsonLd(entry, out);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  const node = value as Record<string, unknown>;
  if (node["@graph"]) flattenJsonLd(node["@graph"], out);
  const type = node["@type"];
  const isProduct =
    (typeof type === "string" && /product/i.test(type)) ||
    (Array.isArray(type) && type.some((t) => typeof t === "string" && /product/i.test(t)));
  if (isProduct) out.push(node as unknown as ProductNode);
  // Some publishers nest the product inside an ItemList.
  if (node.itemListElement) flattenJsonLd(node.itemListElement, out);
}

export function extractJsonLdProducts(html: string): ProductNode[] {
  const found: ProductNode[] = [];
  for (const block of html.matchAll(JSON_LD_BLOCK)) {
    const text = block[1]?.trim();
    if (!text) continue;
    try {
      flattenJsonLd(JSON.parse(text), found);
    } catch {
      // Trailing commas / comment wrappers — try a light cleanup once.
      try {
        flattenJsonLd(JSON.parse(text.replace(/,\s*([}\]])/g, "$1")), found);
      } catch {
        /* unparseable block: skip, later layers still run */
      }
    }
  }
  return found;
}

function brandOf(node: ProductNode): string | null {
  const brand = node.brand;
  if (typeof brand === "string") return stripTags(brand).slice(0, 120) || null;
  if (brand && typeof brand === "object" && brand.name) {
    return stripTags(String(brand.name)).slice(0, 120) || null;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Main parser (pure — unit-tested against fixtures)                           */
/* -------------------------------------------------------------------------- */

const BLOCKED_MARKERS =
  /access denied|are you a robot|verify you are human|unusual traffic|captcha|automated requests|security check|temporarily blocked/i;

/** Signals that the page actually carries product data (vs. a bot shell). */
function hasProductSignal(html: string, meta: Map<string, string[]>): boolean {
  return (
    meta.has("og:title") ||
    meta.has("product:price:amount") ||
    /application\/ld\+json/i.test(html) ||
    /"@type"\s*:\s*"Product"/i.test(html)
  );
}

export function parseProductHtml(html: string, pageUrl: URL): ScrapeOutcome {
  const provider = detectProvider(pageUrl.hostname, html);
  const meta = collectMeta(html);
  const blocked =
    BLOCKED_MARKERS.test(html.slice(0, 20_000)) && !hasProductSignal(html, meta);

  if (blocked) {
    return {
      ok: false,
      code: "blocked",
      provider,
      message: `${provider} blocks automatic page fetching. Open the product link in your browser, then copy the title, price and image links into the form below.`,
    };
  }

  const warnings: string[] = [];
  let title: string | null = null;
  let description: string | null = null;
  let brand: string | null = null;
  let sourcePrice: string | null = null;
  let referencePrice: string | null = null;
  let currency = "INR";
  const imageCandidates: Array<string | { url?: string }> = [];
  let rating: string | null = null;
  let reviewCount: number | null = null;
  let availability: ScrapePreview["availability"] = "unknown";
  let sku: string | null = null;

  // Layer 1 — JSON-LD.
  const [productNode] = extractJsonLdProducts(html);
  if (productNode) {
    title = productNode.name ? stripTags(productNode.name).slice(0, 300) : null;
    description = productNode.description
      ? stripTags(productNode.description).slice(0, 4000)
      : null;
    brand = brandOf(productNode);
    sku = productNode.sku ?? productNode.mpn ?? null;
    if (productNode.image) {
      const imgs = Array.isArray(productNode.image) ? productNode.image : [productNode.image];
      imageCandidates.push(...imgs);
    }
    const offers = Array.isArray(productNode.offers)
      ? productNode.offers
      : productNode.offers
        ? [productNode.offers]
        : [];
    for (const offer of offers) {
      const price = normalizePrice(
        String(offer.price ?? offer.lowPrice ?? ""),
      );
      const high = normalizePrice(String(offer.highPrice ?? ""));
      if (price && !sourcePrice) sourcePrice = price;
      if (high && price && high !== price) referencePrice = high;
      if (offer.priceCurrency) currency = String(offer.priceCurrency).toUpperCase().slice(0, 3);
      const mapped = mapAvailability(offer.availability);
      if (availability === "unknown" && mapped !== "unknown") availability = mapped;
    }
    if (productNode.aggregateRating) {
      rating = normalizeRating(String(productNode.aggregateRating.ratingValue ?? ""));
      reviewCount =
        normalizeReviewCount(productNode.aggregateRating.reviewCount) ??
        normalizeReviewCount(productNode.aggregateRating.ratingCount);
    }
  }

  // Layer 2 — Open Graph / product meta.
  const ogTitle = metaFirst(meta, "og:title", "twitter:title");
  if (ogTitle && !title) title = stripTags(ogTitle).slice(0, 300);
  const ogDescription = metaFirst(
    meta,
    "og:description",
    "twitter:description",
    "description",
  );
  if (ogDescription && !description) description = stripTags(ogDescription).slice(0, 4000);

  const ogSite = metaFirst(meta, "og:site_name");
  if (!brand && ogSite && !new RegExp(provider, "i").test(ogSite)) {
    brand = stripTags(ogSite).slice(0, 120);
  }

  for (const key of ["og:image", "og:image:secure_url", "twitter:image", "twitter:image:src"]) {
    for (const value of meta.get(key) ?? []) imageCandidates.push(value);
  }

  if (!sourcePrice) {
    sourcePrice =
      normalizePrice(metaFirst(meta, "product:price:amount", "og:price:amount", "twitter:data1")) ??
      null;
  }
  const metaCurrency = metaFirst(meta, "product:price:currency", "og:price:currency");
  if (metaCurrency) currency = metaCurrency.toUpperCase().slice(0, 3);
  if (!referencePrice) {
    referencePrice = normalizePrice(metaFirst(meta, "product:mrp", "product:price:mrp", "mrp:price")) ?? null;
  }
  if (availability === "unknown") {
    availability = mapAvailability(metaFirst(meta, "product:availability", "og:availability"));
  }
  if (!rating) rating = normalizeRating(metaFirst(meta, "product:rating", "og:rating", "twitter:data2"));

  // Layer 3 — last resort: <title> tag, and a price scraped from embedded
  // JSON payloads (Next.js RSC windows, GTM blobs) when nothing else worked.
  if (!title) {
    const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleTag?.[1]) {
      const cleaned = stripTags(titleTag[1])
        .split(/\s[|–—-]\s/)[0] // drop " | Site Name" suffixes
        ?.trim();
      if (cleaned && cleaned.length >= 4) title = cleaned.slice(0, 300);
    }
  }
  if (!sourcePrice) {
    const embedded =
      html.match(/"(?:price|salePrice|sale_price|effectivePrice|finalPrice)"\s*:\s*"?(?:₹|Rs\.?)?\s*([0-9][0-9,]{2,9}(?:\.\d{1,2})?)"?/i) ??
      html.match(/(?:₹|Rs\.?)\s?([0-9][0-9,]{2,9}(?:\.\d{1,2})?)/);
    sourcePrice = embedded ? normalizePrice(embedded[1]) : null;
    if (sourcePrice) {
      warnings.push("Price was read from the page's embedded data — please double-check it.");
    }
  }

  const images = new Set<string>();
  collectImages(imageCandidates, pageUrl, images);

  const missingFields: string[] = [];
  if (!title) missingFields.push("title");
  if (!sourcePrice) missingFields.push("price");
  if (images.size === 0) missingFields.push("images");
  if (!description) missingFields.push("description");

  if (!title && !sourcePrice && images.size === 0) {
    return {
      ok: false,
      code: "no_data",
      provider,
      message:
        "This page does not publish product details we can read (no Open Graph tags or structured data). Fill the form manually, or try a different link to the same product.",
    };
  }
  if (missingFields.length > 0) {
    warnings.push(
      `Could not detect: ${missingFields.join(", ")}. Please fill those in before saving.`,
    );
  }
  if (referencePrice && sourcePrice && referencePrice === sourcePrice) {
    referencePrice = null; // identical to the price → not a real MRP
  }

  return {
    ok: true,
    preview: {
      provider,
      siteName: ogSite ? stripTags(ogSite).slice(0, 120) : null,
      url: pageUrl.toString(),
      title,
      description,
      brand,
      sourcePrice,
      referencePrice,
      currency,
      images: [...images].slice(0, 10),
      rating,
      reviewCount,
      availability,
      sku: sku?.slice(0, 80) ?? null,
    },
    warnings,
    missingFields,
  };
}

/* -------------------------------------------------------------------------- */
/* Fetcher                                                                     */
/* -------------------------------------------------------------------------- */

const MAX_BYTES = 4 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20_000;

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-IN,en;q=0.9",
  "Accept-Encoding": "identity",
  "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

/**
 * Fetches and parses a product page. Never throws for expected failures —
 * every outcome is a structured {@link ScrapeOutcome} the route can persist
 * into `product_import_jobs` and render verbatim.
 */
export async function scrapeProductPage(rawUrl: string): Promise<ScrapeOutcome> {
  const url = validateImportUrl(rawUrl);
  const providerGuess = detectProvider(url?.hostname ?? rawUrl);
  if (!url) {
    return {
      ok: false,
      code: "invalid_url",
      provider: providerGuess,
      message: "Enter a full product link starting with http:// or https://.",
    };
  }

  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (response.ok && contentType && !/html|xml/i.test(contentType)) {
      return {
        ok: false,
        code: "no_data",
        provider: detectProvider(url.hostname),
        message: `That link returned ${contentType.split(";")[0]}, not a product page.`,
      };
    }

    const declaredLength = Number(response.headers.get("content-length") ?? "0");
    if (declaredLength > MAX_BYTES) {
      return {
        ok: false,
        code: "too_large",
        provider: detectProvider(url.hostname),
        message: "That page is too large to import (over 4 MB).",
      };
    }

    const text = (await response.text()).slice(0, MAX_BYTES);
    const finalUrl = response.url ? new URL(response.url) : url;

    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status === 429) {
        return {
          ok: false,
          code: "blocked",
          provider: detectProvider(finalUrl.hostname),
          message: `${detectProvider(finalUrl.hostname)} refused the request (HTTP ${response.status}). Open the link in your browser and copy the details into the form.`,
        };
      }
      return {
        ok: false,
        code: "fetch_failed",
        provider: detectProvider(finalUrl.hostname),
        message: `The site responded with HTTP ${response.status}. Check the link and try again.`,
      };
    }

    const outcome = parseProductHtml(text, finalUrl);
    if (outcome.ok) {
      const elapsed = Date.now() - started;
      if (elapsed > FETCH_TIMEOUT_MS * 0.8) {
        outcome.warnings.push("The site responded slowly — verify the imported details.");
      }
    }
    return outcome;
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      code: aborted ? "fetch_failed" : "fetch_failed",
      provider: providerGuess,
      message: aborted
        ? "The site did not respond within 20 seconds. Try again, or enter the details manually."
        : "Could not reach that link. Check the URL and your server's outbound network.",
    };
  } finally {
    clearTimeout(timer);
  }
}
