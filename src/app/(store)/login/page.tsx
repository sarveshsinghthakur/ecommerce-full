import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/redirect";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Aurora to sync your cart, wishlist and orders.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = safeNextPath(next);

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to carry your cart and orders across devices."
      footer={
        <>
          New to Aurora?{" "}
          <Link
            href={`/signup?next=${encodeURIComponent(target)}`}
            className="font-medium text-[var(--color-primary)] hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm next={target} />
    </AuthShell>
  );
}
