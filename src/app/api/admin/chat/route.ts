import { NextResponse } from "next/server";
import { ipFromHeaders } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/authorize";
import { serverEnv } from "@/lib/env";
import { Mistral } from "@mistralai/mistralai";
import { consumeRateLimit } from "@/lib/rate-limit";
import { db } from "@/db";
import { chatMessages, chatSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { newId } from "@/lib/ids";
import { writeAudit } from "@/lib/audit";

/**
 * Chat endpoint for the admin panel.
 *
 * - Creates a new chat session if none exists
 * - Handles chat messages (user + AI)
 * - Supports tool-calling for product creation/editing
 *
 * Rate-limited to 12 requests/minute (RATE_LIMIT_CHAT).
 */

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const env = serverEnv();

    // Rate limit
    const rateLimit = await consumeRateLimit({
      bucket: "chat",
      subject: admin.user.firebaseUid,
      limit: env.RATE_LIMIT_CHAT,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json({
        error: "Too many requests. Please wait before trying again.",
        code: "rate_limit_exceeded",
        resetAt: rateLimit.resetAt,
      }, { status: 429 });
    }

    const body = await request.json();
    const { sessionId, message } = body;

    // Create a new session if none exists
    let session = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!session) {
      const [newSession] = await db.insert(chatSessions).values({
        id: newId("chat"),
        userId: admin.user.id,
        title: "New chat session",
      }).returning();
      session = newSession;
    }

    if (!session) {
      return NextResponse.json({
        error: "Failed to create session.",
      }, { status: 500 });
    }

    // Create a new message
    const messageId = newId("msg");
    const createdAt = new Date();

    // Add to DB
    await db.insert(chatMessages).values({
      id: messageId,
      sessionId: session.id,
      role: "user",
      content: message,
      createdAt,
    });

    // Initialize Mistral client
    const mistral = new Mistral({
      apiKey: env.MISTRAL_API_KEY,
    });

    // Get chat history
    const history = await db
      .select({
        role: chatMessages.role,
        content: chatMessages.content,
      })
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, session.id))
      .orderBy(chatMessages.createdAt)
      .limit(100);

    // Build messages for Mistral
    const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
      {
        role: "system",
        content: `You are the Loop Studio AI assistant for the admin panel.

Your job:
- Create products in the catalogue when the admin asks.
- Edit existing products (change price, title, stock, images, etc.).
- Query products by name, brand, or category.
- **CRITICAL: If the user provides a product URL (Meesho, Amazon, etc.), you MUST immediately call the importProduct tool with that URL.** Do not ask for more info if you have a URL; let the tool handle it.

Rules:
- ALWAYS use a tool when the user asks you to create, edit, query, or import a product.
- If the user gives a product URL, use the importProduct tool.
- For creating products manually, you need: title, brand, category, and price.
- Use INR (₹) for prices.
- Be concise.

Available categories:
- Electronics & Accessories
- Home & Kitchen
- Fashion & Apparel
- Beauty & Personal Care
- Sports & Outdoors
- Books & Stationery
- Grocery & Gourmet
- Toys & Games
- Pet Supplies
- Bags & Luggage`,
      },
      ...history.map(
        (msg: { role: string; content: string }) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })
      ),
      { role: "user", content: message },
    ];

    // Call Mistral with retry on 429 (free tier: 5 req/min)
    let result;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        result = await mistral.chat.complete({
          model: env.MISTRAL_MODEL,
          messages,
          tools: [
            {
              type: "function",
              function: {
                name: "createProduct",
                description: "Create a new product in the catalogue. Use this when the admin asks to add a new product.",
                parameters: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "Product title (e.g. 'Wireless Bluetooth Mouse')" },
                    brand: { type: "string", description: "Brand name (e.g. 'Logitech')" },
                    categoryId: { type: "string", description: "Category ID (e.g. 'cat_0mvdueohrtxzqs7r5' for Fashion & Apparel)" },
                    description: { type: "string", description: "Product description" },
                    sourcePrice: { type: "string", description: "Source price in INR (e.g. '1299')" },
                    markupPercent: { type: "number", description: "Markup percentage (0-100), default 9" },
                    images: { type: "array", items: { type: "string" }, description: "Array of image URLs" },
                  },
                  required: ["title", "brand", "categoryId", "sourcePrice"],
                },
              },
            },
            {
              type: "function",
              function: {
                name: "editProduct",
                description: "Edit an existing product. Use this when the admin wants to change price, title, stock, or images.",
                parameters: {
                  type: "object",
                  properties: {
                    productId: { type: "string", description: "Product ID" },
                    title: { type: "string", description: "New product title" },
                    brand: { type: "string", description: "New brand name" },
                    description: { type: "string", description: "New product description" },
                    sourcePrice: { type: "string", description: "New source price in INR" },
                    markupPercent: { type: "number", description: "New markup percentage (0-100)" },
                    images: { type: "array", items: { type: "string" }, description: "Array of new image URLs" },
                  },
                  required: ["productId"],
                },
              },
            },
            {
              type: "function",
              function: {
                name: "queryProduct",
                description: "Search the catalogue for products. Use this when the admin asks about what products exist.",
                parameters: {
                  type: "object",
                  properties: {
                    query: { type: "string", description: "Search query (e.g. 'wireless mouse', 'men shirts')" },
                  },
                  required: ["query"],
                },
              },
            },
            {
              type: "function",
              function: {
                name: "importProduct",
                description: "Import product details from a product URL. Use this when the admin pastes a Meesho, Amazon, Flipkart, or brand site URL.",
                parameters: {
                  type: "object",
                  properties: {
                    url: { type: "string", description: "Product URL" },
                  },
                  required: ["url"],
                },
              },
            },
          ],
          toolChoice: "auto" as const,
        });
        break; // Success
      } catch (err: any) {
        if (err?.statusCode === 429 && attempt < 2) {
          // Free tier: 5 req/min — wait longer between retries
          const delay = (attempt + 1) * 15000; // 15s, 30s
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }

    if (!result) {
      return NextResponse.json({
        error: "Failed to get AI response.",
        code: "internal_error",
      }, { status: 500 });
    }

    if (!result) {
      return NextResponse.json({
        error: "Failed to get AI response.",
        code: "internal_error",
      }, { status: 500 });
    }

    // Add AI response to DB
    const content = result.choices[0]?.message?.content ?? "";
    await db.insert(chatMessages).values({
      id: newId("msg"),
      sessionId: session.id,
      role: "assistant",
      content: content as string,
      createdAt: new Date(),
    });

    // Write audit
    await writeAudit(
      {
        action: "chat.message",
        actorUid: admin.user.firebaseUid,
        actorEmail: admin.user.email,
        targetType: "chat",
        targetId: session.id,
        summary: `New chat message: ${message.substring(0, 50)}...`,
        ip: ipFromHeaders(request.headers),
      },
      db,
    );

    // Return response
    return NextResponse.json({
      sessionId: session.id,
      messageId,
      content,
      toolCalls: result.choices[0]?.message?.toolCalls,
    });
  } catch (error: any) {
    console.error("[admin/chat] error", error);
    
    // Friendly message for rate limits
    if (error?.statusCode === 429 || error?.code === "1300") {
      return NextResponse.json({
        error: "Mistral rate limit reached. Please wait a minute and try again.",
        code: "rate_limited",
      }, { status: 429 });
    }
    
    return NextResponse.json({
      error: "Failed to process chat message.",
      code: "internal_error",
    }, { status: 500 });
  }
}