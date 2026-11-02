import { NextResponse } from "next/server";
import { ipFromHeaders } from "@/lib/audit";
import { AuthError, requireAdmin } from "@/lib/auth/authorize";
import { adminCreateProduct, productFormSchema } from "@/server/admin-products";
import { parseRequest } from "@/lib/validate";

export const runtime = "nodejs";

/** Creates a catalog product from the admin form (manual or URL-imported). */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const parsed = await parseRequest(request, productFormSchema);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.error, fieldErrors: parsed.fieldErrors },
        { status: 400 },
      );
    }

    const product = await adminCreateProduct(parsed.data, {
      uid: admin.user.firebaseUid,
      email: admin.user.email,
      ip: ipFromHeaders(request.headers),
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error("[admin/products] unexpected error", error);
    return NextResponse.json(
      { error: "Could not create the product. Check the server logs." },
      { status: 500 },
    );
  }
}
