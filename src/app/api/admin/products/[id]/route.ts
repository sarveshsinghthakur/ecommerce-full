import { NextResponse } from "next/server";
import { ipFromHeaders } from "@/lib/audit";
import { AuthError, requireAdmin } from "@/lib/auth/authorize";
import { adminUpdateProduct, productFormSchema } from "@/server/admin-products";
import { parseRequest } from "@/lib/validate";

export const runtime = "nodejs";

/** Updates an existing catalog product from the admin edit form. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const parsed = await parseRequest(request, productFormSchema);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.error, fieldErrors: parsed.fieldErrors },
        { status: 400 },
      );
    }

    const product = await adminUpdateProduct(id, parsed.data, {
      uid: admin.user.firebaseUid,
      email: admin.user.email,
      ip: ipFromHeaders(request.headers),
    });
    if (!product) {
      return NextResponse.json(
        { error: "Product not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error("[admin/products/update] unexpected error", error);
    return NextResponse.json(
      { error: "Could not update the product. Check the server logs." },
      { status: 500 },
    );
  }
}
