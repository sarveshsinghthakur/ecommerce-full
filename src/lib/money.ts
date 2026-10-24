/**
 * Money helpers.
 *
 * Postgres `numeric` is returned by node-postgres as a *string*, so all
 * authoritative arithmetic happens either in SQL or here with explicit string
 * parsing — never with JavaScript floats on user-facing totals.
 */

export type Money = string;

/** Parses a decimal string into bigint minor units (paise), rejecting garbage. */
export function toMinorUnits(value: string | number | null | undefined): bigint {
  if (value === null || value === undefined || value === "") return 0n;
  const raw = typeof value === "number" ? value.toFixed(2) : String(value).trim();
  const m = /^(-?)(\d+)(?:\.(\d{1,}))?$/.exec(raw);
  if (!m) return 0n;
  const sign = m[1] === "-" ? -1n : 1n;
  const whole = m[2] ?? "0";
  const frac = (m[3] ?? "").padEnd(2, "0").slice(0, 2);
  return sign * (BigInt(whole) * 100n + BigInt(frac || "0"));
}

export function fromMinorUnits(minor: bigint): Money {
  const neg = minor < 0n;
  const abs = neg ? -minor : minor;
  const whole = abs / 100n;
  const frac = abs % 100n;
  return `${neg ? "-" : ""}${whole}.${frac.toString().padStart(2, "0")}`;
}

export function addMoney(...values: (string | null | undefined)[]): Money {
  return fromMinorUnits(values.reduce<bigint>((acc, v) => acc + toMinorUnits(v), 0n));
}

export function subMoney(a: string | null | undefined, b: string | null | undefined): Money {
  return fromMinorUnits(toMinorUnits(a) - toMinorUnits(b));
}

export function mulMoney(value: string | null | undefined, times: number): Money {
  // Multiply by an integer-ish factor using minor units; non-integers are
  // scaled by 1000 then divided with half-up rounding to keep determinism.
  const scaled = Math.round(times * 1000);
  const product = toMinorUnits(value) * BigInt(scaled);
  return fromMinorUnits(divRound(product, 1000n));
}

export function cmpMoney(a: string | null | undefined, b: string | null | undefined): number {
  const x = toMinorUnits(a);
  const y = toMinorUnits(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

function divRound(n: bigint, d: bigint): bigint {
  const q = n / d;
  const r = n % d;
  const half = d / 2n;
  if (r >= half) return q + 1n;
  if (-r >= half) return q - 1n;
  return q;
}

const CURRENCY_LOCALES: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
};

export function formatMoney(
  value: string | number | null | undefined,
  currency = "INR",
  opts: { showDecimals?: boolean } = {},
): string {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(toMinorUnits(value)) / 100;
  const locale = CURRENCY_LOCALES[currency] ?? "en-IN";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: opts.showDecimals === false ? 0 : 2,
      maximumFractionDigits: opts.showDecimals === false ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
