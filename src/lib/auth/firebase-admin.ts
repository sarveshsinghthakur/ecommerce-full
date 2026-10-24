/**
 * Server-side Firebase Admin integration.
 *
 * Credentials are read from `FIREBASE_SERVICE_ACCOUNT_JSON` (a single-line JSON
 * blob) or from the individual `FIREBASE_*` variables. Everything here is
 * server-only: nothing from this module may be imported by a Client Component.
 *
 * When credentials are absent the module reports `configured === false` and the
 * callers surface a precise setup instruction instead of crashing.
 */

export interface VerifiedIdentity {
  uid: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  photo: string | null;
  phone: string | null;
}

type AdminAuth = import("firebase-admin/auth").Auth;

let cachedAuth: AdminAuth | null = null;

function credentialFromEnv(): { projectId: string; clientEmail: string; privateKey: string } | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          // Service accounts arrive with literal \n sequences.
          privateKey: parsed.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch {
      return null;
    }
  }
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, "\n") };
  }
  return null;
}

export function firebaseAdminConfigured(): boolean {
  return credentialFromEnv() !== null;
}

/** Human-readable setup instructions surfaced in the UI when not configured. */
export function firebaseAdminSetupHint(): string {
  return [
    "Firebase Admin is not configured.",
    "Create a service account key in Firebase console -> Project settings -> Service accounts,",
    "then set FIREBASE_SERVICE_ACCOUNT_JSON (single-line JSON) in .env.local.",
  ].join(" ");
}

async function getAuth(): Promise<AdminAuth> {
  if (cachedAuth) return cachedAuth;
  const creds = credentialFromEnv();
  if (!creds) throw new Error(firebaseAdminSetupHint());

  const { getApps, initializeApp, cert } = await import("firebase-admin/app");
  const existing = getApps();
  const app =
    existing.find((a) => a.name === "aurora") ??
    initializeApp({ credential: cert(creds), projectId: creds.projectId }, "aurora");

  const { getAuth: adminGetAuth } = await import("firebase-admin/auth");
  cachedAuth = adminGetAuth(app);
  return cachedAuth;
}

/**
 * Verifies a Firebase ID token and returns the canonical identity.
 * @throws when Admin is unconfigured or the token is invalid/expired.
 */
export async function verifyIdToken(idToken: string): Promise<VerifiedIdentity> {
  const auth = await getAuth();
  const decoded = await auth.verifyIdToken(idToken, true /* checkRevoked */);
  if (!decoded.uid) throw new Error("Token did not contain a uid");
  return {
    uid: decoded.uid,
    email: (decoded.email ?? "").toLowerCase(),
    emailVerified: Boolean(decoded.email_verified),
    name: decoded.name ?? null,
    photo: decoded.picture ?? null,
    phone: decoded.phone_number ?? null,
  };
}

/** Looks up an account without verifying a token (used after sign-in). */
export async function getUserByUid(uid: string): Promise<VerifiedIdentity | null> {
  const auth = await getAuth();
  try {
    const u = await auth.getUser(uid);
    return {
      uid: u.uid,
      email: (u.email ?? "").toLowerCase(),
      emailVerified: Boolean(u.emailVerified),
      name: u.displayName ?? null,
      photo: u.photoURL ?? null,
      phone: u.phoneNumber ?? null,
    };
  } catch {
    return null;
  }
}

export function resetFirebaseAdminForTests(): void {
  cachedAuth = null;
}
