import { cn } from "@/lib/cn";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "sale"
  | "accent";

const tones: Record<BadgeTone, string> = {
  neutral:
    "bg-[var(--color-subtle)] text-[var(--color-muted-foreground)] border-[var(--color-border)]",
  primary:
    "bg-[var(--color-primary-soft)] text-[var(--color-primary)] border-transparent",
  success:
    "bg-[var(--color-success-soft)] text-[var(--color-success)] border-transparent",
  warning:
    "bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-transparent",
  danger:
    "bg-[var(--color-destructive-soft)] text-[var(--color-destructive)] border-transparent",
  sale: "bg-[var(--color-sale-soft)] text-[var(--color-sale)] border-transparent",
  accent:
    "bg-[var(--color-accent-soft)] text-[var(--color-accent)] border-transparent",
};

export function Badge({
  tone = "neutral",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--radius-pill)] border px-2 py-0.5",
        "text-xs font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
