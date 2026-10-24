"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useSession } from "@/components/providers";
import { AuthNotice } from "@/components/auth/auth-shell";
import { signInWithEmail, signInWithGoogle, createSession } from "@/lib/auth/firebase-client";

interface Props {
  next: string;
}

export function LoginForm({ next }: Props) {
  const router = useRouter();
  const session = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"email" | "google" | "test" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testName, setTestName] = useState("");

  const firebaseReady = session.firebaseClientConfigured;
  const testReady = session.testModeAvailable;
  const loading = session.loading;

  function messageFor(code: string, fallback: string): string {
    if (code === "auth/invalid-credential" || code === "auth/wrong-password")
      return "That email and password combination does not match an account.";
    if (code === "auth/user-not-found") return "No account exists for that email address.";
    if (code === "auth/too-many-requests")
      return "Too many attempts. Wait a minute and try again.";
    if (code === "auth/invalid-email") return "Enter a valid email address.";
    if (code === "auth/weak-password") return "Use at least 6 characters for your password.";
    if (code === "auth/email-already-in-use") return "An account already exists for that email.";
    if (code === "auth/popup-closed-by-user") return "Sign-in was cancelled before it finished.";
    if (code === "auth/network-request-failed")
      return "Network error. Check your connection and try again.";
    return fallback;
  }

  async function finish(idToken: string): Promise<boolean> {
    const result = await createSession(idToken);
    if (!result.ok) {
      setError(result.error ?? "Could not start a session.");
      return false;
    }
    await session.refresh();
    router.replace(next);
    router.refresh();
    return true;
  }

  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setBusy("email");
    try {
      const user = await signInWithEmail(email.trim(), password);
      await finish(await user.getIdToken());
    } catch (err) {
      const e = err as { code?: string; message?: string };
      setError(messageFor(e.code ?? "", e.message ?? "Could not sign you in."));
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
        body: JSON.stringify({
          testEmail: email.trim(),
          testName: testName.trim() || undefined,
        }),
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

  if (loading) {
    return <p className="text-sm text-[var(--color-muted-foreground)]">Loading…</p>;
  }

  if (!firebaseReady && !testReady) {
    return (
      <AuthNotice tone="info">
        Sign-in is not configured on this deployment. Add the Firebase web keys
        to <code className="font-mono text-xs">.env.local</code>, or set{" "}
        <code className="font-mono text-xs">AUTH_TEST_MODE=true</code> for local
        development.
      </AuthNotice>
    );
  }

  const form = (
    <form onSubmit={handleEmailSubmit} noValidate className="flex flex-col gap-4">
      <div>
        <Label htmlFor="login-email" required>
          Email
        </Label>
        <Input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password" required>
            Password
          </Label>
          <Link
            href={`/forgot-password?next=${encodeURIComponent(next)}`}
            className="text-xs font-medium text-[var(--color-primary)] hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      <Button type="submit" fullWidth loading={busy === "email"}>
        {busy === "email" ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );

  return (
    <div className="flex flex-col gap-4">
      {error ? <AuthNotice>{error}</AuthNotice> : null}

      {firebaseReady ? (
        <>
          {form}
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

      {testReady ? (
        <form onSubmit={handleTestSubmit} noValidate className="flex flex-col gap-4">
          {firebaseReady ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
              Development sign-in
            </p>
          ) : (
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Real Firebase auth is not configured. This shim only works outside
              production.
            </p>
          )}

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
              placeholder="owner@example.com"
              required
            />
          </div>

          {firebaseReady ? (
            <div>
              <Label htmlFor="test-name">Display name</Label>
              <Input
                id="test-name"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="Test User"
              />
            </div>
          ) : null}

          <Button
            type="submit"
            variant={firebaseReady ? "secondary" : "primary"}
            fullWidth
            loading={busy === "test"}
          >
            {busy === "test" ? "Signing in…" : "Sign in (dev)"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
