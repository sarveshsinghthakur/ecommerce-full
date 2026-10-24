"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useSession } from "@/components/providers";
import { AuthNotice } from "@/components/auth/auth-shell";
import {
  createSession,
  sendVerification,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/auth/firebase-client";

interface Props {
  next: string;
}

const MIN_PASSWORD = 8;

export function SignupForm({ next }: Props) {
  const router = useRouter();
  const session = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState<"email" | "google" | "test" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const firebaseReady = session.firebaseClientConfigured;
  const testReady = session.testModeAvailable;
  const showDevForm = testReady && (!firebaseReady || testMode);

  function validate(): boolean {
    if (password.length < MIN_PASSWORD) {
      setLocalError(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return false;
    }
    if (password !== confirm) {
      setLocalError("Those passwords do not match.");
      return false;
    }
    setLocalError(null);
    return true;
  }

  function messageFor(code: string, fallback: string): string {
    if (code === "auth/email-already-in-use")
      return "An account already exists for that email. Try signing in instead.";
    if (code === "auth/invalid-email") return "Enter a valid email address.";
    if (code === "auth/weak-password")
      return `Use at least ${MIN_PASSWORD} characters for your password.`;
    if (code === "auth/too-many-requests")
      return "Too many attempts. Wait a minute and try again.";
    if (code === "auth/network-request-failed")
      return "Network error. Check your connection and try again.";
    return fallback;
  }

  async function finish(idToken: string): Promise<void> {
    const result = await createSession(idToken);
    if (!result.ok) {
      setError(result.error ?? "Could not start a session.");
      setBusy(null);
      return;
    }
    await session.refresh();
    router.replace(next);
    router.refresh();
  }

  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    if (!validate()) return;
    setBusy("email");
    try {
      const user = await signUpWithEmail(email.trim(), password);
      try {
        await sendVerification(user);
        setNotice("We sent a verification link to your inbox. You are signed in already.");
      } catch {
        // Verification mail is best-effort; account creation still succeeded.
      }
      await finish(await user.getIdToken());
    } catch (err) {
      const e = err as { code?: string; message?: string };
      setError(messageFor(e.code ?? "", e.message ?? "Could not create your account."));
      setBusy(null);
    }
  }

  async function handleGoogle() {
    if (busy) return;
    setError(null);
    setBusy("google");
    try {
      const user = await signInWithGoogle();
      await finish(await user.getIdToken());
    } catch (err) {
      const e = err as { code?: string; message?: string };
      setError(messageFor(e.code ?? "", e.message ?? "Google sign-in failed."));
      setBusy(null);
    }
  }

  async function handleTestSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setBusy("test");
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail: email.trim(), testName: name.trim() || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Could not start a session.");
        setBusy(null);
        return;
      }
      await session.refresh();
      router.replace(next);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setBusy(null);
    }
  }

  if (session.loading) {
    return <p className="text-sm text-[var(--color-muted-foreground)]">Loading…</p>;
  }

  if (!firebaseReady && !testReady) {
    return (
      <AuthNotice tone="info">
        Account creation is not configured on this deployment. Add the Firebase
        web keys to <code className="font-mono text-xs">.env.local</code>, or set{" "}
        <code className="font-mono text-xs">AUTH_TEST_MODE=true</code> for local
        development.
      </AuthNotice>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <AuthNotice>{error}</AuthNotice> : null}
      {notice ? <AuthNotice tone="success">{notice}</AuthNotice> : null}

      {showDevForm ? (
        <form onSubmit={handleTestSubmit} noValidate className="flex flex-col gap-4">
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Real Firebase auth is not configured. This shim only works outside
            production.
          </p>
          <div>
            <Label htmlFor="test-name" required>
              Name
            </Label>
            <Input
              id="test-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>
          <div>
            <Label htmlFor="test-email" required>
              Email
            </Label>
            <Input
              id="test-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </div>
          <Button type="submit" fullWidth loading={busy === "test"}>
            {busy === "test" ? "Creating…" : "Create account (dev)"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleEmailSubmit} noValidate className="flex flex-col gap-4">
          <div>
            <Label htmlFor="signup-name" required>
              Name
            </Label>
            <Input
              id="signup-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>

          <div>
            <Label htmlFor="signup-email" required>
              Email
            </Label>
            <Input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="signup-password" required>
              Password
            </Label>
            <Input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              error={localError && password !== confirm ? localError : null}
              required
            />
            <p className="mt-1.5 text-xs text-[var(--color-muted-foreground)]">
              At least {MIN_PASSWORD} characters.
            </p>
          </div>

          <div>
            <Label htmlFor="signup-confirm" required>
              Confirm password
            </Label>
            <Input
              id="signup-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              error={localError && confirm ? localError : null}
              required
            />
          </div>

          <Button type="submit" fullWidth loading={busy === "email"}>
            {busy === "email" ? "Creating account…" : "Create account"}
          </Button>
        </form>
      )}

      {firebaseReady && !showDevForm ? (
        <>
          <div className="flex items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
            <span className="h-px flex-1 bg-[var(--color-border)]" />
            or
            <span className="h-px flex-1 bg-[var(--color-border)]" />
          </div>
          <Button variant="outline" fullWidth onClick={handleGoogle} loading={busy === "google"}>
            {busy === "google" ? "Opening Google…" : "Continue with Google"}
          </Button>
        </>
      ) : null}

      {testReady && firebaseReady && !testMode ? (
        <button
          type="button"
          onClick={() => setTestMode(true)}
          className="text-center text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:underline"
        >
          Use development sign-in instead
        </button>
      ) : null}

      <p className="text-center text-sm text-[var(--color-muted-foreground)]">
        By continuing you agree to our{" "}
        <Link
          href="/terms-and-conditions"
          className="font-medium text-[var(--color-primary)] hover:underline"
        >
          terms
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy-policy"
          className="font-medium text-[var(--color-primary)] hover:underline"
        >
          privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
