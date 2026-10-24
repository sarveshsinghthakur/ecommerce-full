import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

/** Routes that must carry a valid session cookie. */
const AUTH_PREFIXES = ["/account", "/checkout", "/orders", "/wishlist"];

function isStaticOrInternal(pathname: string): boolean {
  return (pathname.startsWith("/_next") ||
  pathname.startsWith("/api/_next") ||
  pathname === "/favicon.ico" ||
  pathname === "/robots.txt" ||
  pathname === "/sitemap.xml" || /\.[a-z0-9]+$/i.test(pathname));
}

function isAdminConfigured(): boolean {
  const emails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  const uids = (process.env.ADMIN_UIDS ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  return emails.length > 0 || uids.length > 0;
}

function isAdminEmail(email: string): boolean {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isStaticOrInternal(pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token, process.env.APP_SECRET ?? "");
  const isAdminRoute = matches(pathname, ["/admin"]);
  const needsAuth = matches(pathname, AUTH_PREFIXES);

  if (isAdminRoute) {
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    // Advisory gate only — `requireAdmin()` re-checks server-side and fails
    // closed. Hiding the nav link is explicitly NOT the security control.
    if (!isAdminConfigured() || !isAdminEmail(session.email)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "?admin=denied";
      url.hash = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (needsAuth && !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(`${pathname}${search}`)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Next.js refuses to run middleware on immutable static assets; keep the
    // matcher narrow so image optimisation and RSC payloads stay untouched.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
