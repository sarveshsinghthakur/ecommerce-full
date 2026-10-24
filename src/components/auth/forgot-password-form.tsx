"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useSession } from "@/components/providers";
import { AuthNotice } from "@/components/auth/auth-shell";
import { sendPasswordReset } from "@/lib/auth/firebase-client";

export function ForgotPasswordForm() {
  const session = useSession();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firebaseReady = session.firebaseClientConfigured;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      const e = err as { code?: string; message?: string };
      if (e.code === "auth/user-not-found") {
        // Firebase already avoids leaking account existence in some flows;
        // mirror that by showing the same neutral message.
        setSent(true);
      } else if (e.code === "auth/invalid-email") {
        setError("Enter a valid email address.");
      } else if (e.code === "auth/too-many-requests") {
        setError("Too many requests. Wait a minute and try again.");
      } else if (e.code === "auth/network-request-failed") {
        setError("Network error. Check your connection and try again.");
      } else {
        setError(e.message ?? "Could not send the reset email.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (session.loading) {
    return <p className="text-sm text-[var(--color-muted-foreground)]">Loading…</p>;
  }

  if (!firebaseReady) {
    return (
      <div className="flex flex-col gap-4">
        <AuthNotice tone="info">
          Password reset requires Firebase. It is not configured on this
          deployment, so the email cannot be sent. In development you can sign in
          with the development shim instead.
        </AuthNotice>
        <Button variant="outline" fullWidth onClick={() => history.back()}>
          Go back
        </Button>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <AuthNotice tone="success">
          If an account exists for <strong>{email}</strong>, a reset link is on
          its way. Check spam if it does not arrive within a few minutes.
        </AuthNotice>
        <Button variant="outline" fullWidth onClick={() => setSent(false)}>
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {error ? <AuthNotice>{error}</AuthNotice> : null}

      <div>
        <Label htmlFor="reset-email" required>
          Email
        </Label>
        <Input
          id="reset-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
          autoFocus
          required
        />
      </div>

      <Button type="submit" fullWidth loading={busy}>
        {busy ? "Sending…" : "Send reset link"}
      </Button>

      <p className="text-center text-sm">
        <Link href="/login" className="font-medium text-[var(--color-primary)] hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
