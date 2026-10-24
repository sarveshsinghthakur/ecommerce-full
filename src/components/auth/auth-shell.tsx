import Link from "next/link";
import { AuroraMark } from "@/components/layout/brand-mark";

/** Centred card used by login / signup / reset-password. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="container-page flex min-h-[70vh] flex-col items-center justify-center py-12">
      <div className="w-full max-w-[24rem]">
        <Link
          href="/"
          className="mx-auto mb-6 flex w-fit items-center gap-2 text-[var(--color-foreground)]"
        >
          <AuroraMark className="size-8" />
          <span className="text-lg font-semibold tracking-tight">
            {process.env.NEXT_PUBLIC_APP_NAME ?? "Aurora"}
          </span>
        </Link>

        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
          <h1 className="text-xl font-semibold tracking-tight text-[var(--color-foreground)]">
            {title}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{subtitle}</p>

          <div className="mt-6">{children}</div>
        </div>

        {footer ? (
          <div className="mt-4 text-center text-sm text-[var(--color-muted-foreground)]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Inline error/success strip shared by the auth forms. */
export function AuthNotice({
  tone = "error",
  children,
}: {
  tone?: "error" | "success" | "info";
  children: React.ReactNode;
}) {
  const tones = {
    error: "border-[var(--color-destructive)] bg-[var(--color-destructive-soft)] text-[var(--color-destructive)]",
    success:
      "border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success)]",
    info: "border-[var(--color-border-strong)] bg-[var(--color-muted)] text-[var(--color-foreground)]",
  } as const;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={tones[tone]}
    >
      <div className="rounded-[var(--radius-control)] border px-3 py-2 text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}
