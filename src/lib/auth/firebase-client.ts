/**
 * Thin, server-side Firebase Web SDK wrapper.
 *
 * The client SDK is initialized only inside a Client Component so that no
 * Firebase Admin material (or any other server secret) can ever reach the
 * browser bundle. Only NEXT_PUBLIC_* configuration is referenced here.
 */

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification as firebaseSendVerification,
  type Auth,
  type User,
} from "firebase/auth";

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export function readClientConfig(): FirebaseClientConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  if (!apiKey || !projectId || !appId) return null;
  return {
    apiKey,
    authDomain:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId,
  };
}

export function isFirebaseClientConfigured(): boolean {
  return readClientConfig() !== null;
}

export function firebaseClientSetupHint(): string {
  return (
    "Firebase web configuration is missing. In the Firebase console add a Web app, " +
    "then copy apiKey / appId into .env.local as NEXT_PUBLIC_FIREBASE_API_KEY and " +
    "NEXT_PUBLIC_FIREBASE_APP_ID (and the remaining NEXT_PUBLIC_FIREBASE_* values)."
  );
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseAuth(): Auth {
  const config = readClientConfig();
  if (!config) throw new Error(firebaseClientSetupHint());
  if (!app) app = getApps()[0] ?? initializeApp(config);
  if (!auth) auth = getAuth(app);
  return auth;
}

/* ----------------------------- sign-in flows ----------------------------- */

export async function signUpWithEmail(email: string, password: string) {
  const a = getFirebaseAuth();
  const cred = await createUserWithEmailAndPassword(a, email, password);
  return cred.user;
}

export async function signInWithEmail(email: string, password: string) {
  const a = getFirebaseAuth();
  const cred = await signInWithEmailAndPassword(a, email, password);
  return cred.user;
}

export async function signInWithGoogle() {
  const a = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const cred = await signInWithPopup(a, provider);
  return cred.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth());
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email);
}

export async function sendVerification(user: User): Promise<void> {
  await firebaseSendVerification(user);
}

export function watchAuthState(handler: (user: User | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), handler);
}

/**
 * Exchanges the Firebase ID token for our own signed session cookie.
 * Returns the resulting profile, or throws with a readable message.
 */
export async function createSession(idToken: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
    credentials: "same-origin",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? "Could not start a session." };
  }
  return { ok: true };
}

export async function destroySession(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
}
