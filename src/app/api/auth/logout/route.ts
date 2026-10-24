import { NextResponse } from "next/server";
import { writeAudit, ipFromHeaders } from "@/lib/audit";
import { db } from "@/db";
import { getOptionalUser } from "@/lib/auth/authorize";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";

export const runtime = "nodejs";

/** Clears the session cookie. Idempotent, safe to call when already signed out. */
export async function POST(request: Request) {
  const user = await getOptionalUser();
  if (user) {
    await writeAudit(
      {
        action: "auth.logout",
        actorUid: user.firebaseUid,
        actorEmail: user.email,
        targetType: "user",
        targetId: user.id,
        summary: `${user.email} signed out.`,
        ip: ipFromHeaders(request.headers),
      },
      db,
    );
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
  return response;
}
