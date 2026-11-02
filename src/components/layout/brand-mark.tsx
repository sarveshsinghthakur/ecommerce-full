/**
 * Loop Studio wordmark glyph — an open loop ring inside a rounded square.
 * Uses `currentColor` so it inherits text colour in light and dark contexts.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={
        className ??
        "grid size-8 place-items-center rounded-[10px] bg-[var(--color-primary)] text-white"
      }
      style={{ background: "var(--color-primary)", color: "white" }}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden>
        <circle
          cx="12"
          cy="12"
          r="7"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="33 11"
          transform="rotate(-45 12 12)"
        />
      </svg>
    </span>
  );
}
