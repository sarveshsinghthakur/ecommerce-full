import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn("size-4 animate-spin text-[var(--color-muted-foreground)]", className)}
      aria-hidden
    />
  );
}

/** Full-area loading placeholder for lists and dashboards. */
export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] py-16 text-[var(--color-muted-foreground)]"
      role="status"
    >
      <Spinner className="size-6" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] bg-[var(--color-muted)] px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="text-[var(--color-muted-foreground)] [&>svg]:size-8">{icon}</div>
      ) : null}
      <div className="max-w-md">
        <p className="text-sm font-semibold text-[var(--color-foreground)]">{title}</p>
        {description ? (
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/** Retry affordance for error boundaries and failed data loads. */
export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: React.ReactNode;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-destructive-soft)] bg-[var(--color-destructive-soft)]/40 px-6 py-12 text-center",
        className,
      )}
    >
      <div>
        <p className="text-sm font-semibold text-[var(--color-destructive)]">{title}</p>
        {description ? (
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{description}</p>
        ) : null}
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
