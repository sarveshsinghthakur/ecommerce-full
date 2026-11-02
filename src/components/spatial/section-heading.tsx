import { cn } from "@/lib/cn";
import { Reveal } from "@/components/animated";

export interface SectionHeadingProps {
  /** Small mono eyebrow above the title, e.g. "Flash sale". */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Rendered flush-right on wide screens (filters, "view all" links). */
  action?: React.ReactNode;
  /** Element type for the title. */
  as?: "h1" | "h2" | "h3";
  /** Sets the heading's `id`, for `aria-labelledby` on a parent section. */
  id?: string;
  align?: "start" | "between";
  className?: string;
  /** Disable the entrance animation (for pages that animate the parent). */
  animated?: boolean;
}

/**
 * The shared storefront section header: an optional mono eyebrow, a title, a
 * one-line description, and an optional trailing action.
 *
 * Every spatial section uses this so headings, spacing and the reveal timing
 * stay identical across the homepage, listings and product pages.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  as: Tag = "h2",
  id,
  align = "start",
  className,
  animated = true,
}: SectionHeadingProps) {
  const heading = (
    <div className="min-w-0">
      {eyebrow ? (
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-accent)]">
          <span className="opacity-60">{"// "}</span>
          {eyebrow}
        </p>
      ) : null}
      <Tag
        id={id}
        className={cn(
          "mt-2 text-balance text-2xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-3xl",
          !eyebrow && "mt-0",
        )}
      >
        {title}
      </Tag>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          {description}
        </p>
      ) : null}
    </div>
  );

  const body = (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end",
        align === "between" && "sm:justify-between",
        className,
      )}
    >
      {heading}
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );

  if (!animated) return body;

  return <Reveal variant="up">{body}</Reveal>;
}
