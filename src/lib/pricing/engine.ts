/**
 * Markup pricing engine.
 *
 * The stored percentage is a **markup over the source price** (cost-plus), not
 * a gross-margin ratio. Every calculation starts from the *source price
 * snapshot* — never from a previously computed selling price — which makes the
 * operation idempotent: re-importing or re-editing a product can never
 * compound the markup.
 *
 *   selling price = source price × (1 + markup% / 100)
 *
 * All arithmetic is done in integer minor units (paise) with rational
 * multiplication, so no IEEE-754 rounding error can leak into a price.
 */

export const MARKUP_PRESETS = [8, 9, 10] as const;
export const DEFAULT_MARKUP_PERCENT = 9;
export const MAX_MARKUP_PERCENT = 100;

export type RoundingMode =
  /** Round up to the next whole currency unit (the INR default). */
  | "whole-unit-up"
  /** Half-up to two decimal places. */
  | "half-up"
  /** Ceiling to the next minor unit. */
  | "up"
  /** Floor to the previous minor unit. */
  | "down";

export interface PricingInput {
  /** The imported / verified source price. Decimal string, e.g. "1049.50". */
  sourcePrice: string | number | null | undefined;
  /** Applicable markup for THIS calculation (global default or product override). */
  markupPercent: string | number | null | undefined;
  /** ISO-4217 code. INR selects whole-rupee rounding by default. */
  currency?: string;
  rounding?: RoundingMode;
  /**
   * Manual final price entered by the admin. When present it wins, and the
   * result is flagged as an override while the calculated value is retained.
   */
  overrideSellingPrice?: string | number | null;
}

export interface PricingResult {
  sourcePrice: string;
  markupPercent: string;
  markupBps: number;
  /** source × (1 + markup/100), rounded to 2dp. Always present, even on override. */
  calculatedSellingPrice: string;
  /** The price the customer pays after rounding (or the manual override). */
  sellingPrice: string;
  /** calculated − source, as a 2dp decimal string. */
  markupAmount: string;
  currency: string;
  rounding: RoundingMode;
  priceOverride: boolean;
}

export class PricingError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "PricingError";
    this.code = code;
  }
}

const AMOUNT_RE = /^\d+(\.\d{1,4})?$/;
const PERCENT_RE = /^\d{1,3}(\.\d{1,2})?$/;

function toDecimalString(value: string | number | null | undefined, field: string): string {
  if (value === null || value === undefined || value === "") {
    throw new PricingError("missing_value", `${field} is required`);
  }
  const s = typeof value === "number" ? value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "") : String(value).trim();
  if (!AMOUNT_RE.test(s)) {
    throw new PricingError("invalid_amount", `${field} must be a non-negative decimal, received "${value}"`);
  }
  if (Number(s) < 0) {
    throw new PricingError("invalid_amount", `${field} cannot be negative`);
  }
  return s;
}

function toMinorUnits(value: string): bigint {
  const [whole = "0", frac = ""] = value.split(".");
  const padded = (frac + "00").slice(0, 2);
  return BigInt(whole) * 100n + BigInt(padded);
}

function fromMinorUnits(minor: bigint): string {
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const whole = abs / 100n;
  const frac = abs % 100n;
  return `${negative ? "-" : ""}${whole}.${frac.toString().padStart(2, "0")}`;
}

/** Parses a percentage (max 2 decimals) into basis points of percent (9 → 900). */
export function toMarkupBps(markupPercent: string | number | null | undefined): number {
  if (markupPercent === null || markupPercent === undefined || markupPercent === "") {
    throw new PricingError("missing_markup", "markupPercent is required");
  }
  const s = String(markupPercent).trim();
  if (!PERCENT_RE.test(s)) {
    throw new PricingError("invalid_markup", `markupPercent must be a number between 0 and ${MAX_MARKUP_PERCENT}, received "${markupPercent}"`);
  }
  const [whole = "0", frac = ""] = s.split(".");
  const bps = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  if (bps > MAX_MARKUP_PERCENT * 100) {
    throw new PricingError("invalid_markup", `markupPercent cannot exceed ${MAX_MARKUP_PERCENT}`);
  }
  return bps;
}

/**
 * Ceiling division for positive numerators and denominators.
 *
 * BigInt division truncates toward zero, so the common `-((-n) / d)` formula
 * silently becomes a floor for positive `n`. Ceiling is `q + 1` whenever there
 * is a non-zero remainder.
 */
function ceilDiv(n: bigint, d: bigint): bigint {
  if (d <= 0n) throw new PricingError("invalid_rounding", "divisor must be positive");
  const q = n / d;
  return n % d > 0n ? q + 1n : q;
}

function roundHalfUp(n: bigint, d: bigint): bigint {
  const q = n / d;
  const r = n % d;
  return r * 2n >= d ? q + 1n : q;
}

function floorDiv(n: bigint, d: bigint): bigint {
  const q = n / d;
  const r = n % d;
  return r < 0n ? q - 1n : q;
}

function defaultRounding(currency: string): RoundingMode {
  return currency.toUpperCase() === "INR" ? "whole-unit-up" : "half-up";
}

/**
 * Computes the full pricing tuple for a source price.
 *
 * @throws {PricingError} for missing/invalid amounts, bad markup, or an
 *         override that is not a valid non-negative amount.
 */
export function calculatePrice(input: PricingInput): PricingResult {
  const currency = (input.currency ?? "INR").toUpperCase();
  const rounding = input.rounding ?? defaultRounding(currency);

  const sourcePrice = toDecimalString(input.sourcePrice, "sourcePrice");
  const markupBps = toMarkupBps(input.markupPercent);
  const markupPercent = formatBps(markupBps);

  const sourceMinor = toMinorUnits(sourcePrice);
  const exactNumerator = sourceMinor * BigInt(10_000 + markupBps);
  const exactDenominator = 10_000n;

  // 2dp representation of the exact product — used for display and history.
  const calculated = fromMinorUnits(roundHalfUp(exactNumerator, exactDenominator));

  let sellingMinor: bigint;
  let priceOverride = false;

  if (
    input.overrideSellingPrice !== null &&
    input.overrideSellingPrice !== undefined &&
    input.overrideSellingPrice !== ""
  ) {
    const override = toDecimalString(input.overrideSellingPrice, "overrideSellingPrice");
    sellingMinor = toMinorUnits(override);
    priceOverride = true;
  } else {
    sellingMinor = applyRounding(exactNumerator, exactDenominator, rounding);
  }

  const sellingPrice = fromMinorUnits(sellingMinor);
  const calculatedMinor = toMinorUnits(calculated);
  const markupAmount = fromMinorUnits(calculatedMinor - sourceMinor);

  return {
    sourcePrice,
    markupPercent,
    markupBps,
    calculatedSellingPrice: calculated,
    sellingPrice,
    markupAmount,
    currency,
    rounding,
    priceOverride,
  };
}

/**
 * Convenience for the common case: recompute a product's price from its stored
 * source snapshot. Accepting only `sourcePrice` (never `sellingPrice`) is the
 * structural guarantee against double-markup.
 */
export function priceFromSource(sourcePrice: string | number | null, markupPercent: string | number | null, currency = "INR"): PricingResult {
  return calculatePrice({ sourcePrice, markupPercent, currency });
}

function applyRounding(numerator: bigint, denominator: bigint, mode: RoundingMode): bigint {
  switch (mode) {
    case "up":
      return ceilDiv(numerator, denominator);
    case "down":
      return floorDiv(numerator, denominator);
    case "half-up":
      return roundHalfUp(numerator, denominator);
    case "whole-unit-up": {
      const exactMinor = ceilDiv(numerator, denominator);
      const unit = 100n; // one whole currency unit in minor units
      const rem = exactMinor % unit;
      return rem === 0n ? exactMinor : exactMinor + (unit - rem);
    }
    default: {
      throw new PricingError("invalid_rounding", `Unsupported rounding mode: ${String(mode)}`);
    }
  }
}

function formatBps(bps: number): string {
  const whole = Math.floor(bps / 100);
  const frac = bps % 100;
  return frac === 0 ? String(whole) : `${whole}.${frac.toString().padStart(2, "0").replace(/0$/, "")}`;
}

/**
 * Policy for when a stored price may be recomputed.
 * A manual override always wins until the admin explicitly clears it.
 */
export interface RecalcPolicy {
  /** Recompute when a newly verified source price differs from the stored one. */
  recalcOnSourceChange: boolean;
  /** Recompute when the global markup percentage changes. */
  recalcOnGlobalMarkupChange: boolean;
}

export const DEFAULT_RECALC_POLICY: RecalcPolicy = {
  recalcOnSourceChange: true,
  recalcOnGlobalMarkupChange: false,
};

export interface ExistingPrice {
  sourcePrice: string | null;
  markupPercent: string | null;
  sellingPrice: string | null;
  priceOverride: boolean;
}

export interface RecalcDecision {
  shouldRecalculate: boolean;
  reason:
    | "unchanged"
    | "source_reprice"
    | "markup_change"
    | "manual_override_preserved"
    | "missing_price";
  next?: PricingResult;
}

/**
 * Decides whether an existing product price should be recomputed.
 * Never mutates a manual override; never runs without an explicit trigger.
 */
export function decideRecalculation(
  existing: ExistingPrice,
  nextSourcePrice: string | null,
  nextMarkupPercent: string | null,
  currency: string,
  policy: RecalcPolicy = DEFAULT_RECALC_POLICY,
  trigger: "source_reprice" | "markup_change" | "manual" = "manual",
): RecalcDecision {
  if (existing.priceOverride) {
    return { shouldRecalculate: false, reason: "manual_override_preserved" };
  }
  if (!nextSourcePrice || !nextMarkupPercent) {
    return { shouldRecalculate: false, reason: "missing_price" };
  }
  const sourceChanged = normalise(existing.sourcePrice) !== normalise(nextSourcePrice);
  const markupChanged = normalise(existing.markupPercent) !== normalise(nextMarkupPercent);

  if (trigger === "source_reprice" && sourceChanged && !policy.recalcOnSourceChange) {
    return { shouldRecalculate: false, reason: "unchanged" };
  }
  if (trigger === "markup_change" && markupChanged && !policy.recalcOnGlobalMarkupChange) {
    return { shouldRecalculate: false, reason: "unchanged" };
  }
  if (!sourceChanged && !markupChanged) {
    return { shouldRecalculate: false, reason: "unchanged" };
  }

  const next = calculatePrice({
    sourcePrice: nextSourcePrice,
    markupPercent: nextMarkupPercent,
    currency,
  });
  if (next.sellingPrice === normalise(existing.sellingPrice)) {
    return { shouldRecalculate: false, reason: "unchanged" };
  }
  return {
    shouldRecalculate: true,
    reason: sourceChanged ? "source_reprice" : "markup_change",
    next,
  };
}

function normalise(v: string | null | undefined): string | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : String(v);
}
