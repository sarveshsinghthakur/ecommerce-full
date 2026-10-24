import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { newId } from "@/lib/ids";
import { clientSubject, enforceRateLimit } from "@/lib/rate-limit";
import { serverEnv } from "@/lib/env";
import { parseRequest } from "@/lib/validate";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().trim().min(1, "Tell us your name.").max(120),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  subject: z.string().trim().min(1, "Add a subject.").max(160),
  message: z
    .string()
    .trim()
    .min(10, "Please write at least 10 characters.")
    .max(5000),
  /** Honeypot: real browsers never fill this hidden field. */
  website: z.string().max(0).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  try {
    const parsed = await parseRequest(request, bodySchema);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.error, fieldErrors: parsed.fieldErrors },
        { status: 400 },
      );
    }

    if (parsed.data.website) {
      // Silently accept bot submissions so the form gives nothing away.
      return NextResponse.json({ ok: true });
    }

    const limit = await enforceRateLimit({
      bucket: "contact",
      subject: clientSubject(request.headers),
      limit: serverEnv().RATE_LIMIT_CONTACT,
      windowSeconds: 3600,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "You have sent several messages recently. Please try again later." },
        { status: 429 },
      );
    }

    await db.insert(contactMessages).values({
      id: newId("msg"),
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject,
      message: parsed.data.message,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[contact] failed to store message", error);
    return NextResponse.json(
      { error: "We could not send that message. Please try again." },
      { status: 500 },
    );
  }
}
