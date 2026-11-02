import { cn } from "@/lib/cn";

interface SectionLabelProps {
  /** Uppercase mono micro-label, e.g. "Section 01 · Shop by category". */
  children: React.ReactNode;
  className?: string;
  /** Renders on the dark variant (light text on navy surfaces). */
  tone?: "light" | "dark";
}

/**
 * The `// SECTION 01 · SYSTEM ARCHITECTURE` micro-label from the reference
 * design: monospace, uppercase, wide tracking, teal.
 */
export function SectionLabel({
  children,
  className,
  tone = "light",
}: SectionLabelProps) {
  return (
    <p
      aria-hidden
      className={cn(
        "font-mono text-[11px] font-medium uppercase tracking-[0.16em]",
        tone === "light" ? "text-[var(--color-accent)]" : "text-[var(--color-accent-2)]",
        className,
      )}
    >
      <span className="opacity-60">{"// "}</span>
      {children}
    </p>
  );
}
