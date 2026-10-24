import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { safeNextPath } from "@/lib/redirect";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create an Aurora account to save your cart, wishlist and addresses.",
  robots: { index: false, follow: false },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = safeNextPath(next);

  return (
    <AuthShell
      title="Create your account"
      subtitle="Save addresses, track orders and keep your wishlist in sync."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(target)}`}
            className="font-medium text-[var(--color-primary)] hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm next={target} />
    </AuthShell>
  );
}
