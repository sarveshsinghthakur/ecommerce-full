/**
 * Development / demo seed.
 *
 * Creates the catalogue the storefront needs to be browsable: categories,
 * published products with real markup maths, images, source listings and price
 * history, plus the default store settings.
 *
 * Idempotent by default (it refuses to run against a populated catalogue) and
 * `--force` truncates the catalogue first.
 *
 *   npm run db:seed
 *   npm run db:seed -- --force
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import {
  categories,
  productImages,
  productPriceHistory,
  products,
  sourceListings,
  storeSettings,
} from "./schema";
import { priceFromSource } from "../lib/pricing/engine";
import { slugify } from "../lib/slug";
import { newId } from "../lib/ids";

interface SeedProduct {
  brand: string;
  title: string;
  category: string;
  source: number;
  mrp?: number;
  rating: number;
  reviews: number;
  stock: number;
  blurb: string;
}

const CATEGORIES: { name: string; description: string }[] = [
  { name: "Electronics & Accessories", description: "Chargers, audio, cables and everyday gadgets." },
  { name: "Home & Kitchen", description: "Cookware, storage and the small things that make a kitchen work." },
  { name: "Fashion & Apparel", description: "Everyday clothing and footwear from trusted brands." },
  { name: "Beauty & Personal Care", description: "Skincare, grooming and personal care essentials." },
  { name: "Sports & Outdoors", description: "Fitness gear, hydration and outdoor equipment." },
  { name: "Books & Stationery", description: "Reading, planning and desk supplies." },
  { name: "Grocery & Gourmet", description: "Pantry staples and teatime favourites." },
  { name: "Toys & Games", description: "Puzzles, board games and screen-free play." },
  { name: "Pet Supplies", description: "Food, grooming and play for household pets." },
  { name: "Bags & Luggage", description: "Backpacks, duffels and cabin trolleys." },
];

const PRODUCTS: SeedProduct[] = [
  // Electronics & Accessories
  { brand: "boAt", title: "Airdopes 141 TWS Earbuds", category: "Electronics & Accessories", source: 1099, mrp: 2990, rating: 4.2, reviews: 18432, stock: 42, blurb: "42-hour playback, low-latency gaming mode and an IPX4 splash-resistant build for daily commutes." },
  { brand: "Ambrane", title: "20000mAh 20W Fast Charging Power Bank", category: "Electronics & Accessories", source: 1499, mrp: 3499, rating: 4.1, reviews: 9310, stock: 27, blurb: "Dual output, 20W PD charging and a clear LED indicator — enough for two full phone charges on the move." },
  { brand: "Portronics", title: "Konnect L 60W USB-C to USB-C Cable 1.2m", category: "Electronics & Accessories", source: 349, mrp: 799, rating: 4.3, reviews: 6120, stock: 120, blurb: "Braided 60W cable rated for 10,000 bends, suitable for laptops, tablets and phones." },
  { brand: "Zebronics", title: "Zeb-Transformer Gaming Mouse", category: "Electronics & Accessories", source: 649, mrp: 1499, rating: 4.0, reviews: 4210, stock: 58, blurb: "Six programmable buttons, adjustable DPI up to 4800 and breathing LED backlight." },
  { brand: "TP-Link", title: "N300 Wi-Fi Range Extender", category: "Electronics & Accessories", source: 1299, mrp: 2199, rating: 4.2, reviews: 7745, stock: 19, blurb: "Extends existing Wi-Fi into dead zones with a one-button WPS setup and a compact wall-plug body." },

  // Home & Kitchen
  { brand: "Prestige", title: "Omega Deluxe Granite Non-Stick Kadai 24cm", category: "Home & Kitchen", source: 1349, mrp: 2395, rating: 4.3, reviews: 5210, stock: 34, blurb: "Five-layer granite coating, cool-touch handle and induction-compatible base for everyday curries and stir-fries." },
  { brand: "Milton", title: "Thermosteel Flip Lid Flask 1000ml", category: "Home & Kitchen", source: 899, mrp: 1595, rating: 4.4, reviews: 11208, stock: 61, blurb: "Double-wall vacuum insulation keeps drinks hot for 24 hours and cold for 24 hours." },
  { brand: "Butterfly", title: "Stainless Steel Mixer Grinder 750W 4 Jars", category: "Home & Kitchen", source: 3299, mrp: 5995, rating: 4.1, reviews: 3480, stock: 12, blurb: "750W copper motor with overload protection and four jars covering grinding, juicing and chutney." },
  { brand: "Cello", title: "Polypropylene Storage Container Set of 12", category: "Home & Kitchen", source: 649, mrp: 1299, rating: 4.2, reviews: 8102, stock: 76, blurb: "Airtight, stackable and transparent so you can see what is running low at a glance." },
  { brand: "Nirlon", title: "Induction Friendly Non-Stick Tawa 25cm", category: "Home & Kitchen", source: 549, mrp: 1099, rating: 4.0, reviews: 2904, stock: 44, blurb: "Scratch-resistant coating with a heat-resistant handle, suited to rotis, dosas and parathas." },

  // Fashion & Apparel
  { brand: "Allen Solly", title: "Men's Slim Fit Formal Shirt", category: "Fashion & Apparel", source: 1099, mrp: 2199, rating: 4.1, reviews: 3612, stock: 38, blurb: "Wrinkle-resistant cotton blend cut close through the chest, in office-appropriate solid shades." },
  { brand: "Levis", title: "Men's 511 Slim Fit Jeans", category: "Fashion & Apparel", source: 2199, mrp: 3999, rating: 4.3, reviews: 6740, stock: 21, blurb: "Mid-rise stretch denim with a tapered leg — the everyday pair that holds its shape." },
  { brand: "Bata", title: "Women's Casual Slip-On Sneakers", category: "Fashion & Apparel", source: 999, mrp: 1799, rating: 4.0, reviews: 2480, stock: 55, blurb: "Cushioned footbed and a lightweight sole for long days on your feet." },
  { brand: "Fabindia", title: "Women's Cotton Kurti with Straight Pants", category: "Fashion & Apparel", source: 1799, mrp: 3299, rating: 4.2, reviews: 1904, stock: 26, blurb: "Hand-block printed cotton with a breathable weave and a relaxed, flattering fall." },
  { brand: "Wildcraft", title: "Unisex Round Neck Cotton T-Shirt", category: "Fashion & Apparel", source: 549, mrp: 1099, rating: 4.2, reviews: 7420, stock: 94, blurb: "180 GSM combed cotton that stays soft wash after wash, pre-shrunk to keep its size." },

  // Beauty & Personal Care
  { brand: "Mamaearth", title: "Vitamin C Face Serum 30ml", category: "Beauty & Personal Care", source: 499, mrp: 699, rating: 4.1, reviews: 12408, stock: 63, blurb: "Vitamin C and turbright extracts to even out tone, with a lightweight non-sticky finish." },
  { brand: "Cetaphil", title: "Gentle Skin Cleanser 250ml", category: "Beauty & Personal Care", source: 549, mrp: 749, rating: 4.4, reviews: 9820, stock: 48, blurb: "Soap-free, fragrance-free cleansing for sensitive and dry skin — works with or without water." },
  { brand: "Philips", title: "Beard Trimmer Cordless BT3231", category: "Beauty & Personal Care", source: 1499, mrp: 2295, rating: 4.3, reviews: 5310, stock: 23, blurb: "20 length settings, 60-minute runtime and self-sharpening blades that stay consistent." },
  { brand: "Colgate", title: "Visible White Whitening Toothpaste 200g", category: "Beauty & Personal Care", source: 249, mrp: 340, rating: 4.0, reviews: 4190, stock: 130, blurb: "Gentle polishing action for a visibly brighter smile in two weeks of twice-daily brushing." },
  { brand: "Nova", title: "Professional Hair Dryer 1600W", category: "Beauty & Personal Care", source: 899, mrp: 1799, rating: 3.9, reviews: 2140, stock: 31, blurb: "Two heat settings with a cool shot, a concentrator nozzle and overheat protection." },

  // Sports & Outdoors
  { brand: "Nivia", title: "Storm Football Size 5", category: "Sports & Outdoors", source: 649, mrp: 1199, rating: 4.1, reviews: 3820, stock: 47, blurb: "Hand-stitched rubber with a textured grip that holds up on hard ground and wet grass alike." },
  { brand: "Cosco", title: "Aluminium Badminton Racket Pair", category: "Sports & Outdoors", source: 1099, mrp: 1999, rating: 4.2, reviews: 2210, stock: 29, blurb: "Lightweight alloy frames with a strung tension suited to recreational doubles play." },
  { brand: "Boldfit", title: "Resistance Bands Set of 5", category: "Sports & Outdoors", source: 549, mrp: 1299, rating: 4.3, reviews: 6640, stock: 88, blurb: "Five graded bands from light to extra heavy, with a carry bag and a door anchor." },
  { brand: "Milton", title: "1 Litre Sports Squeeze Bottle", category: "Sports & Outdoors", source: 299, mrp: 499, rating: 4.2, reviews: 5120, stock: 104, blurb: "Leak-proof flip cap, wide mouth for ice and easy cleaning, BPA-free Tritan body." },
  { brand: "Strauss", title: "Adjustable Dumbbell Pair 20kg", category: "Sports & Outdoors", source: 1799, mrp: 3499, rating: 4.0, reviews: 1840, stock: 14, blurb: "Cast iron plates with a knurled anti-slip handle and collars that stay put mid-set." },

  // Books & Stationery
  { brand: "Classmate", title: "Ruled Notebook 240 pages A5", category: "Books & Stationery", source: 149, mrp: 210, rating: 4.3, reviews: 4460, stock: 150, blurb: "70 GSM paper that resists bleed-through, with a lay-flat binding that actually stays open." },
  { brand: "Faber-Castell", title: "Colour Pencils Set of 24", category: "Books & Stationery", source: 399, mrp: 550, rating: 4.5, reviews: 3910, stock: 72, blurb: "Bright, break-resistant leads with a soft laydown — suitable for children and adult colouring." },
  { brand: "Camlin", title: "Permanent Marker Pen Pack of 5", category: "Books & Stationery", source: 179, mrp: 250, rating: 4.1, reviews: 2610, stock: 118, blurb: "Quick-drying, water-resistant ink that writes on cardboard, plastic, metal and glass." },
  { brand: "Parker", title: "Vector Standard Rollerball Pen", category: "Books & Stationery", source: 449, mrp: 595, rating: 4.2, reviews: 1980, stock: 66, blurb: "A balanced barrel and a fine 0.5mm tip for signatures and long-form writing." },
  { brand: "Moleskine", title: "Classic Softcover Notebook Large", category: "Books & Stationery", source: 999, mrp: 1499, rating: 4.4, reviews: 1120, stock: 24, blurb: "Acid-free paper, an expandable inner pocket and an elastic closure in a travel-ready size." },

  // Grocery & Gourmet
  { brand: "Tata", title: "Sampann Whole Wheat Atta 5kg", category: "Grocery & Gourmet", source: 349, mrp: 425, rating: 4.3, reviews: 7204, stock: 96, blurb: "100% sharbati wheat, low in gluten and milled to keep the bran and germ intact." },
  { brand: "Taj Mahal", title: "Premium Tea Bags Pack of 100", category: "Grocery & Gourmet", source: 399, mrp: 475, rating: 4.2, reviews: 5310, stock: 84, blurb: "Assam leaf tea in string-and-tag bags that brew a strong, consistent cup every time." },
  { brand: "Figaro", title: "Olive Oil 100% Pure 1L", category: "Grocery & Gourmet", source: 749, mrp: 945, rating: 4.1, reviews: 3120, stock: 57, blurb: "Light, neutral-tasting olive oil for everyday Indian cooking and deep frying." },
  { brand: "Nutella", title: "Chocolate Hazelnut Spread 600g", category: "Grocery & Gourmet", source: 649, mrp: 799, rating: 4.5, reviews: 4480, stock: 39, blurb: "Creamy hazelnut and cocoa spread — breakfast, dessert and everything in between." },
  { brand: "Aashirvaad", title: "Premium Select Basmati Rice 5kg", category: "Grocery & Gourmet", source: 749, mrp: 950, rating: 4.4, reviews: 6040, stock: 51, blurb: "Aged grains that stay separate after cooking, with the aroma biryani and pulao deserve." },

  // Toys & Games
  { brand: "Funskool", title: "Jigsaw Puzzle 100 Pieces - Indian Wildlife", category: "Toys & Games", source: 349, mrp: 599, rating: 4.3, reviews: 1640, stock: 63, blurb: "Thick, low-glare pieces with a matte finish — a rainy-afternoon favourite for ages 6 and up." },
  { brand: "Hasbro", title: "Monopoly Classic Board Game", category: "Toys & Games", source: 1299, mrp: 1799, rating: 4.4, reviews: 3240, stock: 27, blurb: "The full property-trading classic with updated tokens and a sturdy game board." },
  { brand: "LEGO", title: "Classic Bricks and Ideas Box 484 Pieces", category: "Toys & Games", source: 2999, mrp: 3999, rating: 4.7, reviews: 2110, stock: 16, blurb: "An open-ended brick box with enough variety to build whatever the afternoon invents." },
  { brand: "Yahoot", title: "Magnetic Building Tiles Set of 40", category: "Toys & Games", source: 799, mrp: 1499, rating: 4.2, reviews: 1420, stock: 45, blurb: "Strong magnets inside translucent tiles — structures go up fast and come down safely." },

  // Pet Supplies
  { brand: "Drools", title: "Adult Dog Food Chicken & Egg 10kg", category: "Pet Supplies", source: 1499, mrp: 1999, rating: 4.3, reviews: 5810, stock: 33, blurb: "Chicken-first kibble with egg and rice for medium and large adult dogs." },
  { brand: "Meowow", title: "Clumping Cat Litter Lavender 10L", category: "Pet Supplies", source: 549, mrp: 799, rating: 4.1, reviews: 2260, stock: 71, blurb: "Fast-clumping, low-dust litter with a light lavender scent and strong odour control." },
  { brand: "Petsburg", title: "Rope Toy Set for Dogs Pack of 3", category: "Pet Supplies", source: 399, mrp: 699, rating: 4.2, reviews: 1180, stock: 88, blurb: "Knot and loop rope toys that stand up to tug-of-war and help clean teeth." },

  // Bags & Luggage
  { brand: "Skybags", title: "22 Inch Cabin Trolley Suitcase", category: "Bags & Luggage", source: 1899, mrp: 3999, rating: 4.1, reviews: 2840, stock: 18, blurb: "Hard-shell polycarbonate with spinner wheels and a TSA-approved lock." },
  { brand: "Wildcraft", title: "25 Litre Laptop Backpack", category: "Bags & Luggage", source: 1499, mrp: 2699, rating: 4.3, reviews: 6180, stock: 41, blurb: "Padded 15.6-inch laptop sleeve, breathable back panel and a water-resistant outer shell." },
  { brand: "American Tourister", title: "Nash Daypack 25L", category: "Bags & Luggage", source: 1199, mrp: 2100, rating: 4.2, reviews: 3490, stock: 36, blurb: "A compact daily pack with a dedicated laptop compartment and a quick-reach front pocket." },
];

function imageUrlFor(slug: string, index: number): string {
  return `https://picsum.photos/seed/${encodeURIComponent(`${slug}-${index}`)}/800/800`;
}

async function main() {
  const force = process.argv.includes("--force");

  async function countRows() {
    const res = (await db.execute(sql`select count(*)::int as n from products`)) as {
      rows: { n: number }[];
    };
    return Number(res.rows[0]?.n ?? 0);
  }

  const count = await countRows();
  if (count > 0 && !force) {
    console.log(
      `Catalogue already has ${count} products. Re-run with --force to wipe and re-seed.`,
    );
    process.exit(0);
  }

  if (force) {
    console.log("Removing existing catalogue…");
    await db.delete(productImages);
    await db.delete(productPriceHistory);
    await db.delete(sourceListings);
    await db.delete(products);
    await db.delete(categories);
  }

  console.log("Inserting categories…");
  const categoryIds = new Map<string, string>();
  for (const category of CATEGORIES) {
    const slug = slugify(category.name);
    const [row] = await db
      .insert(categories)
      .values({ id: newId("cat"), name: category.name, slug, description: category.description })
      .onConflictDoNothing({ target: categories.slug })
      .returning({ id: categories.id });
    if (row) {
      categoryIds.set(category.name, row.id);
    } else {
      const [existingRow] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, slug))
        .limit(1);
      if (existingRow) categoryIds.set(category.name, existingRow.id);
    }
  }

  console.log(`Inserting ${PRODUCTS.length} products…`);
  let inserted = 0;
  for (const item of PRODUCTS) {
    const slug = slugify(item.title);
    const pricing = priceFromSource(item.source, 9, "INR");
    const [product] = await db
      .insert(products)
      .values({
        id: newId("prd"),
        slug,
        title: item.title,
        brand: item.brand,
        description: item.blurb,
        categoryId: categoryIds.get(item.category) ?? null,
        currency: "INR",
        sourcePrice: pricing.sourcePrice,
        markupPercent: pricing.markupPercent,
        calculatedSellingPrice: pricing.calculatedSellingPrice,
        sellingPrice: pricing.sellingPrice,
        priceOverride: false,
        referencePrice: item.mrp ? String(item.mrp.toFixed(2)) : null,
        priceVerifiedAt: new Date(),
        status: "published",
        rating: item.rating.toFixed(2),
        reviewCount: item.reviews,
        stockQuantity: item.stock,
        availability: item.stock > 0 ? "in_stock" : "out_of_stock",
        searchKeywords: `${item.category} ${item.brand}`,
        importCount: 1,
        lastImportedAt: new Date(),
        publishedAt: new Date(),
      })
      .onConflictDoNothing({ target: products.slug })
      .returning({ id: products.id });
    if (!product) continue;
    inserted += 1;

    await db.insert(productImages).values([
      { id: newId("img"), productId: product.id, url: imageUrlFor(slug, 1), position: 0, source: "imported" },
      { id: newId("img"), productId: product.id, url: imageUrlFor(slug, 2), position: 1, source: "imported" },
      { id: newId("img"), productId: product.id, url: imageUrlFor(slug, 3), position: 2, source: "imported" },
    ]);

    await db.insert(productPriceHistory).values({
      id: newId("prh"),
      productId: product.id,
      sourcePrice: pricing.sourcePrice,
      markupPercent: pricing.markupPercent,
      calculatedSellingPrice: pricing.calculatedSellingPrice,
      sellingPrice: pricing.sellingPrice,
      currency: "INR",
      reason: "initial_import",
      note: "Seeded catalogue entry.",
    });

    const sourceSlug = item.brand.toLowerCase().replace(/[^a-z0-9]+/g, "");
    await db.insert(sourceListings).values({
      id: newId("src"),
      productId: product.id,
      provider: "meesho",
      sourceUrl: `https://www.meesho.com/${slug}/${sourceSlug}`,
      sourceUrlNormalized: `meesho:${slug}`,
      sourceProductId: `${sourceSlug}-${item.source}`,
      sourcePrice: pricing.sourcePrice,
      sourceCurrency: "INR",
      sourceRating: item.rating.toFixed(2),
      sourceReviewCount: item.reviews,
      sourceAvailability: "in_stock",
      fetchedAt: new Date(),
      verifiedAt: new Date(),
    });
  }

  console.log("Writing store settings…");
  const settings: Record<string, unknown> = {
    pricing: { defaultMarkupPercent: 9, minMarkupPercent: 8, maxMarkupPercent: 10, rounding: "whole-unit-up" },
    shipping: { freeAbove: 499, flatFee: 49, dispatchHours: 24 },
    currency: { code: "INR", symbol: "₹" },
    chatbot: { enabled: true, greeting: "Hi! Ask me about products, orders or delivery." },
  };
  for (const [key, value] of Object.entries(settings)) {
    await db
      .insert(storeSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: storeSettings.key, set: { value, updatedAt: new Date() } });
  }

  const finalCount = await countRows();
  console.log(
    `Seeded ${inserted} new products (${CATEGORIES.length} categories). Catalogue now holds ${finalCount}.`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
