import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";

export interface PriceProps {
  /** Current selling price as a decimal string, e.g. "1090.00". */
  value: string | number | null | undefined;
  /** Optional original price; shown struck through when higher than `value`. */
  compareAt?: string | number | null;
  currency?: string;
  className?: string;
  /** Hide `.00` on whole amounts for a cleaner catalogue grid. */
  compact?: boolean;
}

/**
 * Formatted price with an optional compare-at line.
 *
 * The compare-at price is only rendered when it is genuinely higher, so a
 * stale or mis-entered value can never imply a fake discount.
 */
export function Price({
  value,
  compareAt,
  currency = "INR",
  className,
  compact = false,
}: PriceProps) {
  const hasCompare =
    compareAt !== null &&
    compareAt !== undefined &&
    compareAt !== "" &&
    Number(compareAt) > Number(value ?? 0);

  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
        {formatMoney(value, currency, { showDecimals: !compact })}
      </span>
      {hasCompare ? (
        <s className="text-sm font-normal tabular-nums text-[var(--color-muted-foreground)]">
          {formatMoney(compareAt, currency, { showDecimals: !compact })}
        </s>
      ) : null}
    </span>
  );
}

/** Percentage discount derived from a compare-at price; null when not a sale. */
export function discountPercent(
  value: string | number | null | undefined,
  compareAt: string | number | null | undefined,
): number | null {
  const now = Number(value);
  const was = Number(compareAt);
  if (!Number.isFinite(now) || !Number.isFinite(was) || was <= 0 || was <= now) return null;
  return Math.round(((was - now) / was) * 100);
}
