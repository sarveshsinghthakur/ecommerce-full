import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-semibold text-[var(--color-primary)]">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">
        We couldn&apos;t find that page
      </h1>
      <p className="max-w-md text-sm text-[var(--color-muted-foreground)]">
        The link may be outdated, or the product may no longer be available.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex h-10 items-center rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
      >
        Back to store
      </Link>
    </div>
  );
}
