/**
 * Aurora wordmark glyph — a four-point sparkle inside a rounded square.
 * Uses `currentColor` so it inherits text colour in light and dark contexts.
 */
export function AuroraMark({ className }: { className?: string }) {
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
        <path
          d="M12 2.5c.5 4.9 4.1 8.5 9 9-4.9.5-8.5 4.1-9 9-.5-4.9-4.1-8.5-9-9 4.9-.5 8.5-4.1 9-9Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}
