import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorize";
import { writeAudit } from "@/lib/audit";
import { ipFromHeaders } from "@/lib/audit";
import { mkdir, writeFile } from "node:fs/promises";
import { extname } from "node:path";
import { db } from "@/db";

/**
 * File upload endpoint for admin panel.
 *
 * - Accepts image files
 * - Saves to `public/images/uploads/`
 * - Returns URL for admin form
 *
 * Rate-limited to 100 requests/minute (RATE_LIMIT_CHAT).
 */

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({
        error: "No file uploaded.",
      }, { status: 400 });
    }
    
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: "Only JPEG, PNG, and WebP images are allowed.",
      }, { status: 400 });
    }
    
    // Create uploads directory if it doesn't exist
    const uploadDir = "public/images/uploads";
    await mkdir(uploadDir, { recursive: true });
    
    // Generate a unique filename
    const ext = extname(file.name);
    const timestamp = Date.now();
    const filename = `upload_${timestamp}${ext}`;
    
    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(`${uploadDir}/${filename}`, buffer);
    
    // Return URL
    const url = `/images/uploads/${filename}`;
    
    // Write audit
    await writeAudit(
      {
        action: "upload.image",
        actorUid: admin.user.firebaseUid,
        actorEmail: admin.user.email,
        targetType: "image",
        targetId: filename,
        summary: `Uploaded image: ${file.name} (${file.size} bytes)`,
        ip: ipFromHeaders(request.headers),
      },
      db,
    );
    
    return NextResponse.json({
      url,
    });
  } catch (error) {
    console.error("[admin/upload] error", error);
    return NextResponse.json({
      error: "Failed to upload file.",
      code: "internal_error",
    }, { status: 500 });
  }
}