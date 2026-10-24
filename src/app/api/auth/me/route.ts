import { NextResponse } from "next/server";
import {
  adminConfigured,
  adminSetupHint,
  getOptionalUser,
  isTestModeAvailable,
  resolveAdmin,
} from "@/lib/auth/authorize";
import { firebaseAdminConfigured } from "@/lib/auth/firebase-admin";
import { isFirebaseClientConfigured } from "@/lib/auth/firebase-client";

export const runtime = "nodejs";

/**
 * Reports the current session plus the flags the client needs to render
 * navigation and the auth screens: whether an admin area exists, whether this
 * user may enter it, and which sign-in methods are actually available.
 */
export async function GET() {
  const capabilities = {
    adminConfigured: adminConfigured(),
    firebaseConfigured: firebaseAdminConfigured(),
    firebaseClientConfigured: isFirebaseClientConfigured(),
    testModeAvailable: isTestModeAvailable(),
  };

  const user = await getOptionalUser();
  if (!user) {
    return NextResponse.json({
      authenticated: false,
      user: null,
      isAdmin: false,
      ...capabilities,
    });
  }

  const admin = await resolveAdmin(user);
  return NextResponse.json({
    authenticated: true,
    isAdmin: admin !== null,
    ...capabilities,
    ...(capabilities.adminConfigured ? {} : { adminSetupHint: adminSetupHint() }),
    user: {
      id: user.id,
      email: user.email,
      name: user.displayName,
      photo: user.photoUrl,
      emailVerified: user.emailVerified,
    },
  });
}
