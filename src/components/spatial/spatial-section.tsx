import { cn } from "@/lib/cn";

export interface SpatialSectionProps {
  children: React.ReactNode;
  className?: string;
  /** Constrains to the storefront's max content width (default true). */
  contained?: boolean;
  /** Vertical rhythm preset. */
  spacing?: "tight" | "normal" | "loose";
  /** Adds the frosted panel treatment around the whole section. */
  surface?: "none" | "glass-surface" | "glass-raised" | "glass-inset";
  id?: string;
  /** Passed to the underlying <section> for aria-labelledby wiring. */
  "aria-labelledby"?: string;
}

const spacing: Record<NonNullable<SpatialSectionProps["spacing"]>, string> = {
  tight: "py-6 sm:py-8",
  normal: "py-10 sm:py-14",
  loose: "py-14 sm:py-20",
};

/**
 * The canonical wrapper for a storefront section.
 *
 * Handles the shared horizontal container and vertical rhythm so sections
 * never drift out of alignment, and optionally applies one of the frosted
 * surface treatments when a section should read as a floating panel.
 */
export function SpatialSection({
  children,
  className,
  contained = true,
  spacing: rhythm = "normal",
  surface = "none",
  id,
  "aria-labelledby": labelledBy,
}: SpatialSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn("relative w-full", spacing[rhythm], className)}
    >
      <div
        className={cn(
          contained && "mx-auto w-full max-w-[1440px] px-4 lg:px-8",
          surface !== "none" && `${surface} rounded-[var(--radius-panel)] p-5 sm:p-8`,
        )}
      >
        {children}
      </div>
    </section>
  );
}
