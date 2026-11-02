/**
 * Sources real product photography for the catalogue.
 *
 * The seed data shipped `picsum.photos` random photos, so a backpack showed a
 * beach and a dog toy showed a mountain. This replaces every one of them with
 * an actual photograph of the right kind of object, sourced from Wikimedia
 * Commons (free-licensed, stable, keyless) and stored locally in
 * `public/images/products/`.
 *
 * Storing locally matters: it means no runtime hotlinking, no link rot, and
 * every image can be eyeballed before it ships.
 *
 *   node scripts/source-images.mjs            # fetch all
 *   node scripts/source-images.mjs <slug>     # re-fetch one
 *   node scripts/source-images.mjs --dry      # print the plan only
 */

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const UA = { "User-Agent": "LoopStudioDev/1.0 (catalogue image sourcing)" };
const OUT_DIR = "public/images/products";
const CAT_OUT_DIR = "public/images/categories";
const WIDTH = 900;

/**
 * Rejects files that are not photographs. Commons happily returns `.ogg`,
 * `.svg`, `.tif` and `.webm` from a category listing — an `.ogg` even has a
 * generated waveform *thumbnail*, so it sails past a `content-type: image/*`
 * check on download and lands a sound wave in the catalogue.
 */
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
function isBitmap(c) {
  return IMAGE_EXT.test(c.url) && IMAGE_EXT.test(c.title);
}

/**
 * Category cover images. Categories ship no imagery at all today (every
 * `categories.image_url` is NULL), so these fill the department tiles that
 * currently fall back to a generic placeholder.
 */
const CATEGORY_TERMS = {
  "electronics-and-accessories": ["cat:Consumer electronics", "electronics gadgets", "circuit board"],
  "home-and-kitchen": ["cat:Kitchen utensils", "cookware", "kitchen utensils"],
  "fashion-and-apparel": ["cat:Clothing", "clothing rack", "apparel"],
  "beauty-and-personal-care": ["cat:Cosmetics", "toiletries", "beauty products"],
  "sports-and-outdoors": ["cat:Sports equipment", "sports gear", "gym equipment"],
  "books-and-stationery": ["cat:Books", "bookshelf books", "stationery"],
  "grocery-and-gourmet": ["cat:Supermarkets", "grocery store", "food pantry"],
  "toys-and-games": ["cat:Toys", "toy shop", "board games"],
  "pet-supplies": ["cat:Pet supplies", "dog and cat", "pet shop"],
  "bags-and-luggage": ["cat:Luggage", "handbags", "travel bags"],
};

/**
 * Curated search terms — one **array** per product slug, tried in order until
 * one yields a usable image.
 *
 * Commons ANDs every word in a query, so a long phrase ("hiking daypack
 * backpack") returns nothing when any single word is rare. Each list therefore
 * runs from specific to general: the first term that produces a good hit wins,
 * and the broad fallbacks guarantee we never come away empty-handed.
 *
 * Terms describe the *object*, not the brand — Commons photographs generic
 * products well but has no reason to carry a specific Indian-market SKU.
 */
const TERMS = {
  // Bags & Luggage
  "22-inch-cabin-trolley-suitcase": ["trolley suitcase", "rolling luggage", "suitcase"],
  "25-litre-laptop-backpack": ["laptop backpack", "backpack", "rucksack"],
  "nash-daypack-25l": ["daypack", "hiking backpack", "backpack"],

  // Beauty & Personal Care
  "beard-trimmer-cordless-bt3231": ["beard trimmer", "electric shaver", "hair clipper"],
  "gentle-skin-cleanser-250ml": ["250ml HDPE pump plastic bottle", "soap dispenser bottle", "lotion pump bottle"],
  "professional-hair-dryer-1600w": ["hair dryer", "hairdryer", "blow dryer"],
  "visible-white-whitening-toothpaste-200g": ["toothpaste", "toothpaste tube"],
  "vitamin-c-face-serum-30ml": ["cat:Dropper bottles", "dropper bottle", "cosmetic bottle"],

  // Books & Stationery
  "classic-softcover-notebook-large": ["notebook", "exercise book", "notepad"],
  "colour-pencils-set-of-24": ["coloured pencils", "coloring pencils", "pencil set"],
  "permanent-marker-pen-pack-of-5": ["marker pen", "felt tip pen", "permanent marker"],
  "ruled-notebook-240-pages-a5": ["spiral notebook", "notebook paper", "ruled notebook"],
  "vector-standard-rollerball-pen": ["rollerball pen", "ballpoint pen", "fountain pen"],

  // Electronics & Accessories
  "20000mah-20w-fast-charging-power-bank": ["power bank", "portable charger", "battery pack"],
  "airdopes-141-tws-earbuds": ["wireless earbuds", "earbuds", "in-ear headphones"],
  "konnect-l-60w-usb-c-to-usb-c-cable-1-2m": ["usb-c cable", "usb type-c", "charging cable"],
  "n300-wi-fi-range-extender": ["wifi extender", "range extender", "wireless router"],
  "zeb-transformer-gaming-mouse": ["gaming mouse", "computer mouse", "optical mouse"],

  // Fashion & Apparel
  "men-s-511-slim-fit-jeans": ["cat:Jeans", "blue jeans", "denim jeans"],
  "men-s-slim-fit-formal-shirt": ["cat:Dress shirts", "formal shirt", "dress shirt"],
  "unisex-round-neck-cotton-t-shirt": ["cat:T-shirts", "t-shirt", "cotton shirt"],
  "women-s-casual-slip-on-sneakers": ["sneaker", "canvas shoe", "footwear"],
  "women-s-cotton-kurti-with-straight-pants": ["kurti women clothing", "salwar kameez woman", "cat:Salwar kameez"],

  // Grocery & Gourmet
  "chocolate-hazelnut-spread-600g": ["nutella", "chocolate hazelnut spread", "chocolate spread jar"],
  "olive-oil-100-pure-1l": ["olive oil", "olive oil bottle"],
  "premium-select-basmati-rice-5kg": ["basmati rice", "rice grains", "rice bag"],
  "premium-tea-bags-pack-of-100": ["tea bags", "tea box", "black tea"],
  "sampann-whole-wheat-atta-5kg": ["wheat flour", "flour bag", "atta"],

  // Home & Kitchen
  "induction-friendly-non-stick-tawa-25cm": ["cat:Frying pans", "frying pan", "crepe pan", "flat pan"],
  "omega-deluxe-granite-non-stick-kadai-24cm": ["cat:Woks", "kadai", "wok", "cooking pan"],
  "polypropylene-storage-container-set-of-12": ["cat:Tupperware", "food container", "lunch box"],
  "stainless-steel-mixer-grinder-750w-4-jars": ["cat:Blenders", "food processor", "kitchen mixer"],
  "thermosteel-flip-lid-flask-1000ml": ["thermos flask", "vacuum flask", "water flask"],

  // Pet Supplies
  "adult-dog-food-chicken-and-egg-10kg": ["dog food", "dog kibble", "pet food"],
  "clumping-cat-litter-lavender-10l": ["cat litter", "litter box", "kitty litter"],
  "rope-toy-set-for-dogs-pack-of-3": ["cat:Dog toys", "rope toy", "dog toy", "chew toy"],

  // Sports & Outdoors
  "1-litre-sports-squeeze-bottle": ["sports bottle", "water bottle", "squeeze bottle"],
  "adjustable-dumbbell-pair-20kg": ["cat:Dumbbells", "dumbbell weights", "barbell"],
  "aluminium-badminton-racket-pair": ["badminton racket", "racket", "shuttlecock"],
  "resistance-bands-set-of-5": ["resistance band", "exercise band", "fitness band"],
  "storm-football-size-5": ["football", "soccer ball", "sports ball"],

  // Toys & Games
  "classic-bricks-and-ideas-box-484-pieces": ["lego bricks", "building bricks", "toy bricks"],
  "jigsaw-puzzle-100-pieces-indian-wildlife": ["jigsaw puzzle pieces", "jigsaw puzzle", "cat:Jigsaw puzzles"],
  "magnetic-building-tiles-set-of-40": ["cat:Toy building blocks", "magnetic tiles", "toy blocks"],
  "monopoly-classic-board-game": ["board game", "monopoly", "tabletop game"],
};

/* -------------------------------------------------------------------------- */
/* Relevance gate                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Hard keyword gate for products whose free-text search keeps pulling
 * something unrelated. A candidate is skipped unless its file title contains
 * at least one of these words.
 *
 * Applied as a *filter with a built-in relaxation*: if no candidate matches,
 * the pass falls back to the unfiltered list so a product can never end up
 * with nothing just because Commons phrases its files unusually.
 */
const MUST = {
  "gentle-skin-cleanser-250ml": ["cleanser", "soap", "lotion", "cream", "cosmetic", "bottle"],
  "vitamin-c-face-serum-30ml": ["serum", "dropper", "vial", "bottle", "cosmetic"],
  "ruled-notebook-240-pages-a5": ["notebook", "exercise", "ruled", "notepad"],
  "men-s-511-slim-fit-jeans": ["jeans", "denim", "trouser", "pants"],
  "unisex-round-neck-cotton-t-shirt": ["t-shirt", "tshirt", "shirt", "tee"],
  "women-s-cotton-kurti-with-straight-pants": ["kurti", "kurta", "salwar", "tunic", "dress", "clothing"],
  "induction-friendly-non-stick-tawa-25cm": ["tawa", "griddle", "pan", "skillet"],
  "omega-deluxe-granite-non-stick-kadai-24cm": ["kadai", "wok", "pan", "skillet", "pot"],
  "polypropylene-storage-container-set-of-12": ["container", "tupperware", "bowl", "dish", "plastic"],
  "stainless-steel-mixer-grinder-750w-4-jars": ["mixer", "grinder", "blender", "processor"],
  "rope-toy-set-for-dogs-pack-of-3": ["rope", "toy", "knot", "chew"],
  "adjustable-dumbbell-pair-20kg": ["dumbbell", "barbell", "kettlebell", "weight"],
  "resistance-bands-set-of-5": ["resistance", "band", "elastic", "exercise"],
  "magnetic-building-tiles-set-of-40": ["magnetic", "tile", "block", "construction"],
  "clumping-cat-litter-lavender-10l": ["litter", "kitty", "granule", "cat"],
  "jigsaw-puzzle-100-pieces-indian-wildlife": ["puzzle", "jigsaw"],
  "storm-football-size-5": ["football", "soccer", "ball"],
};

/**
 * Titles that describe software, space, artwork, or places rather than a
 * physical product. This is what let "Mercury render with Blender" win the
 * mixer grinder, "Solar Orbiter's view of the Sun" win the magnetic tiles,
 * and a shipping-container yard win "storage containers".
 */
const NEGATIVE =
  /\b(render|renders|3d|cgi|screenshot|splashscreen|software|animation|model|painting|drawing|engraving|map|diagram|chart|poster|advertisement|ceremony|portrait|monument|statue|museum|building|street|road|mine|mines|schema|esquema|schematic|aerial|panorama|view|war|army|protest|church|cathedral|castle|bridge|tower|station|airport|harbour|harbor|valley|forest|landscape|river|coast|beach|sky|cloud|sunset|night|moving|shipping|freight|truck|ad\b|advertisement)\b/i;

/**
 * Title fragments that mark a file as *likely the product itself*. Scoring
 * prefers these, so a curated category still surfaces the object rather than
 * whichever member happens to be the highest-resolution photo.
 */
const PREFER = {
  "gentle-skin-cleanser-250ml": ["250ml", "hdpe", "pump", "bottle", "lotion", "soap"],
  "vitamin-c-face-serum-30ml": ["serum", "dropper", "bottle", "vial", "pipette"],
  "men-s-511-slim-fit-jeans": ["jeans", "denim", "trouser"],
  "unisex-round-neck-cotton-t-shirt": ["t-shirt", "tshirt", "shirt", "tee"],
  "women-s-cotton-kurti-with-straight-pants": ["kurta", "kurti", "salwar", "kameez"],
  "induction-friendly-non-stick-tawa-25cm": ["tawa", "griddle", "pan", "skillet", "crepe"],
  "omega-deluxe-granite-non-stick-kadai-24cm": ["kadai", "wok", "karahi", "pan"],
  "polypropylene-storage-container-set-of-12": ["tupperware", "tub", "bowl", "lunch"],
  "stainless-steel-mixer-grinder-750w-4-jars": ["blender", "mixer", "processor", "kitchen"],
  "rope-toy-set-for-dogs-pack-of-3": ["toy", "rope", "knot", "chew"],
  "magnetic-building-tiles-set-of-40": ["tile", "block", "magnetic", "toy", "brick"],
  "ruled-notebook-240-pages-a5": ["spiral", "notebook", "ruled", "paper"],
  "women-s-cotton-kurti-with-straight-pants": ["kurti", "salwar", "woman"],
  "jigsaw-puzzle-100-pieces-indian-wildlife": ["jigsaw", "puzzle", "pieces"],
  // Category covers.
  "electronics-and-accessories": ["electronic", "device", "gadget", "circuit", "computer"],
  "home-and-kitchen": ["kitchen", "cookware", "utensil", "pan", "pot"],
  "fashion-and-apparel": ["cloth", "dress", "shirt", "fashion", "apparel"],
  "beauty-and-personal-care": ["cosmetic", "beauty", "cream", "lotion", "bottle"],
  "sports-and-outdoors": ["sport", "ball", "racket", "gym", "fitness"],
  "books-and-stationery": ["book", "library", "shelf", "stationery"],
  "grocery-and-gourmet": ["grocery", "supermarket", "market", "shelf", "food"],
  "toys-and-games": ["toy", "game", "puzzle", "block"],
  "pet-supplies": ["pet", "dog", "cat", "animal", "puppy", "kitten"],
  "bags-and-luggage": ["bag", "luggage", "suitcase", "backpack", "handbag"],
  "chocolate-hazelnut-spread-600g": ["nutella", "chocolate", "spread", "jar"],
};

function containsAny(title, needles) {
  const t = title.toLowerCase();
  return needles.some((n) => t.includes(n));
}

/* -------------------------------------------------------------------------- */
/* Commons search                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Looks up a Commons **category** instead of running free-text search.
 *
 * Free-text search ANDs every word and happily returns a tree species for
 * "tawa" or a politician for "kurti". A curated category lists exactly the
 * objects of interest, so `cat:Kurtas` can never drift into politics.
 */
async function categoryMembers(category, limit = 20) {
  const params = new URLSearchParams({
    action: "query",
    generator: "categorymembers",
    gcmtitle: `Category:${category.replace(/^Category:/i, "")}`,
    gcmtype: "file",
    gcmlimit: String(limit),
    prop: "imageinfo",
    iiprop: "url|size|mime",
    iiurlwidth: String(WIDTH),
    format: "json",
  });

  let res = null;
  for (let i = 0; i < 4; i++) {
    if (i > 0) await sleep(1200 * i);
    try {
      res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
        headers: UA,
      });
    } catch {
      continue;
    }
    if (res.ok) break;
    if (res.status !== 429 && res.status < 500) break;
    res = null;
  }
  if (!res || !res.ok) return [];

  const data = await res.json();
  return Object.values(data.query?.pages ?? {})
    .map((p) => {
      const info = p.imageinfo?.[0];
      if (!info) return null;
      return {
        title: p.title.replace(/^File:/, ""),
        url: (info.thumburl ?? info.url).split("?")[0],
        width: info.thumbwidth ?? info.width,
        height: info.thumbheight ?? info.height,
        index: p.index ?? 99,
      };
    })
    .filter(Boolean)
    .filter(isBitmap);
}

/** Dispatches `cat:` terms to the category reader, plain terms to search. */
function lookup(term, limit) {
  // A wider pool matters: scoring only works if there is something to score,
  // and category pages are unsorted, so 4 members is rarely enough to find
  // the actual object among the incidental photos.
  const pool = limit ?? 30;
  return term.startsWith("cat:")
    ? categoryMembers(term.slice(4), pool)
    : search(term, pool);
}

async function search(term, limit = 8) {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: `filetype:bitmap ${term}`,
    gsrnamespace: "6",
    gsrlimit: String(limit),
    prop: "imageinfo",
    iiprop: "url|size|mime",
    iiurlwidth: String(WIDTH),
    format: "json",
  });

  // The API throttles bursts, and a throttled search used to be read as
  // "this product has no image at all". Retry so a 429 is never mistaken
  // for an empty catalogue.
  let res = null;
  for (let i = 0; i < 4; i++) {
    if (i > 0) await sleep(1200 * i);
    try {
      res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
        headers: UA,
      });
    } catch {
      continue;
    }
    if (res.ok) break;
    if (res.status !== 429 && res.status < 500) break;
    console.log(`   ! search "${term}" -> HTTP ${res.status}, retrying`);
    res = null;
  }
  if (!res || !res.ok) {
    console.log(`   ! search "${term}" failed (HTTP ${res?.status ?? "fetch"})`);
    return [];
  }

  const data = await res.json();
  return Object.values(data.query?.pages ?? {})
    .map((p) => {
      const info = p.imageinfo?.[0];
      if (!info) return null;
      return {
        title: p.title.replace(/^File:/, ""),
        // Strip the tracking params Commons appends.
        url: (info.thumburl ?? info.url).split("?")[0],
        width: info.thumbwidth ?? info.width,
        height: info.thumbheight ?? info.height,
        index: p.index ?? 99,
      };
    })
    .filter(Boolean)
    .filter(isBitmap)
    .sort((a, b) => a.index - b.index);
}

/* -------------------------------------------------------------------------- */
/* Candidate scoring — prefer clean, near-square product shots                 */
/* -------------------------------------------------------------------------- */

const BAD_TITLE =
  /logo|icon|sprite|diagram|chart|map|poster|screenshot|flag|coat of arms|seal|signature|graph|scan|document|isbn|barcode/i;

function score(c, slug) {
  let s = 0;
  // Landscape or square beats tall portraits for a product card.
  const ratio = c.width / c.height;
  if (ratio >= 0.75 && ratio <= 1.6) s += 3;
  if (c.width >= 700) s += 2;
  if (/\.(jpe?g|png)$/i.test(c.url)) s += 1;
  if (BAD_TITLE.test(c.title)) s -= 10;

  // The decisive term: a file naming the actual object beats a prettier
  // photo of something else. Without this, a shipping-container yard wins
  // "storage containers" purely for being sharp and square.
  const prefer = PREFER[slug];
  if (prefer && containsAny(c.title, prefer)) s += 8;

  return s;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Downloads one candidate, retrying with backoff.
 *
 * Commons throttles bursts of thumbnail requests, so a plain sequential loop
 * gets a stream of 429/403s that look like "no image exists". Every failure
 * mode is logged with its status so the real cause is visible.
 */
async function download(url, { attempts = 4 } = {}) {
  let last = "unknown";
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await sleep(700 * 2 ** i); // 1.4s, 2.8s, 5.6s
    let res;
    try {
      res = await fetch(url, { headers: UA });
    } catch (e) {
      last = `fetch:${e.message}`;
      continue;
    }
    if (res.status === 429 || res.status === 403) {
      last = `http:${res.status}`;
      continue;
    }
    if (!res.ok) {
      last = `http:${res.status}`;
      return { error: last };
    }
    const type = res.headers.get("content-type") ?? "";
    if (!/image\//.test(type)) {
      return { error: `type:${type || "none"}` };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    // Real Commons thumbnails are tens of KB; a few hundred bytes means the
    // response was an error page dressed up as an image.
    if (buf.length < 1_500) {
      last = `tiny:${buf.length}`;
      continue;
    }
    return { buf, ext: type.includes("png") ? "png" : "jpg" };
  }
  return { error: last };
}

/* -------------------------------------------------------------------------- */
/* Main                                                                        */
/* -------------------------------------------------------------------------- */

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const force = args.includes("--force");
const doCategories = args.includes("--categories");
const only = args.filter((a) => !a.startsWith("--"));

// `--categories` swaps both the term map and the destination directory so the
// same pipeline can fill `categories.image_url` (currently NULL for all ten).
const TERM_MAP = doCategories ? CATEGORY_TERMS : TERMS;
const OUT = doCategories ? CAT_OUT_DIR : OUT_DIR;

const slugs = only.length ? only : Object.keys(TERM_MAP);
await mkdir(OUT, { recursive: true });

const missing = Object.keys(TERM_MAP).filter((s) => !slugs.includes(s));
if (missing.length) console.log(`(restricted run — skipping ${missing.length})\n`);

let okCount = 0;
const failures = [];

for (const slug of slugs) {
  const termList = TERM_MAP[slug];
  if (!termList) {
    console.log(`?? no curated term for ${slug}`);
    failures.push(slug);
    continue;
  }

  const dest = `${OUT}/${slug}.jpg`;
  // `--force` re-downloads everything; otherwise a good local file is kept.
  if (!force && existsSync(dest)) {
    console.log(`· ${slug}  (already on disk, skipping)`);
    continue;
  }

  try {
    if (dry) {
      for (const term of termList) {
        const results = await lookup(term, 3);
        console.log(`\n${slug}  <- "${term}"  (${results.length})`);
        results.forEach((r) => console.log(`    ${r.title}  [${r.width}x${r.height}]`));
        await sleep(600);
      }
      continue;
    }

    let saved = false;
    let lastError = "no candidates";

    // Walk specific -> general. The first term that yields a downloadable
    // image wins; a niche phrase returning nothing just falls through to its
    // broader sibling instead of failing the product outright.
    for (const term of termList) {
      const results = await lookup(term);

      // Screen out software/space/artwork titles, then apply the product's
      // own keyword gate — relaxing it if that would leave nothing at all.
      let ranked = results
        .filter((r) => !BAD_TITLE.test(r.title) && !NEGATIVE.test(r.title))
        .sort((a, b) => score(b, slug) - score(a, slug));

      const must = MUST[slug];
      const prefer = PREFER[slug];
      // A curated category is already precise, and its filenames are arbitrary
      // ("Beilschmiedia tawa 11.JPG" would be filtered out by a "pan" gate),
      // so the hard keyword gate only applies to free-text results.
      if (must && !term.startsWith("cat:")) {
        // Strict on purpose. Relaxing to the unfiltered list is what let the
        // magnetic tiles fall back to a photo of the Sun: when nothing
        // matches the gate, the correct response is to try the *next* search
        // term, not to accept any random hit.
        ranked = ranked.filter((r) => containsAny(r.title, must));
      } else if (prefer) {
        // Softer gate: keep the preference hits when there are any, otherwise
        // fall through so a product can still get *something* rather than
        // nothing at all.
        const strict = ranked.filter((r) => containsAny(r.title, prefer));
        if (strict.length > 0) ranked = strict;
      }

      for (const candidate of ranked.slice(0, 8)) {
        const dl = await download(candidate.url);
        if (dl.error) {
          lastError = dl.error;
          await sleep(500);
          continue;
        }
        await writeFile(dest, dl.buf);
        console.log(`✓ ${slug}\n    "${term}" -> ${candidate.title}`);
        okCount++;
        saved = true;
        break;
      }

      if (saved) break;
      await sleep(700);
    }

    if (!saved) {
      console.log(`✗ ${slug}  (last: ${lastError})`);
      failures.push(`${slug}[${lastError}]`);
    }
    // Pace the whole run — Commons rate-limits bursts across URLs too.
    await sleep(900);
  } catch (e) {
    console.log(`✗ ${slug}  ERROR ${e.message}`);
    failures.push(slug);
  }
}

if (!dry) {
  console.log(`\n${okCount}/${slugs.length} sourced`);
  if (failures.length) console.log(`failed: ${failures.join(", ")}`);
}
