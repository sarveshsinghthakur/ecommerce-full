import { describe, expect, it } from "vitest";
import {
  DEFAULT_MARKUP_PERCENT,
  MARKUP_PRESETS,
  PricingError,
  calculatePrice,
  decideRecalculation,
  priceFromSource,
  toMarkupBps,
} from "./engine";

describe("calculatePrice — documented reference cases", () => {
  const cases: Array<[string, string, string]> = [
    ["100", "8", "108.00"],
    ["100", "9", "109.00"],
    ["100", "10", "110.00"],
    ["500", "9", "545.00"],
    ["1000", "10", "1100.00"],
  ];

  for (const [source, markup, expected] of cases) {
    it(`source ${source} × ${markup}% → ${expected}`, () => {
      const r = calculatePrice({ sourcePrice: source, markupPercent: markup });
      expect(r.sellingPrice).toBe(expected);
      expect(r.calculatedSellingPrice).toBe(expected);
      expect(r.markupAmount).toBe(
        (Number(expected) - Number(source)).toFixed(2),
      );
    });
  }
});

describe("INR whole-rupee rounding", () => {
  it("rounds up to the next whole rupee", () => {
    // 199 × 1.09 = 216.91 → 217
    const r = calculatePrice({ sourcePrice: "199", markupPercent: "9" });
    expect(r.calculatedSellingPrice).toBe("216.91");
    expect(r.sellingPrice).toBe("217.00");
  });

  it("leaves an exact whole value untouched", () => {
    const r = calculatePrice({ sourcePrice: "50", markupPercent: "10" });
    expect(r.sellingPrice).toBe("55.00");
  });

  it("never rounds a price down", () => {
    // 49.99 × 1.09 = 54.4891 → whole rupee up → 55
    const r = calculatePrice({ sourcePrice: "49.99", markupPercent: "9" });
    expect(r.calculatedSellingPrice).toBe("54.49");
    expect(r.sellingPrice).toBe("55.00");
  });

  it("supports non-INR currencies with half-up 2dp rounding", () => {
    const r = calculatePrice({
      sourcePrice: "19.99",
      markupPercent: "9",
      currency: "USD",
    });
    expect(r.calculatedSellingPrice).toBe("21.79");
    expect(r.sellingPrice).toBe("21.79");
    expect(r.rounding).toBe("half-up");
  });

  it("honours an explicit rounding mode", () => {
    const down = calculatePrice({
      sourcePrice: "199.99",
      markupPercent: "9",
      rounding: "down",
    });
    // 199.99 × 1.09 = 217.9891 → floor to paise
    expect(down.sellingPrice).toBe("217.98");

    const up = calculatePrice({
      sourcePrice: "199.99",
      markupPercent: "9",
      rounding: "up",
    });
    expect(up.sellingPrice).toBe("217.99");
  });
});

describe("markup never compounds", () => {
  it("produces the identical result when re-run on the same source price", () => {
    const first = priceFromSource("1049", "9");
    const second = priceFromSource("1049", "9");
    expect(second.sellingPrice).toBe(first.sellingPrice);
    expect(second.calculatedSellingPrice).toBe(first.calculatedSellingPrice);
  });

  it("does not apply markup to an already marked-up selling price", () => {
    const once = calculatePrice({ sourcePrice: "1000", markupPercent: "9" });
    // A buggy implementation would feed `sellingPrice` back in.
    const wrong = calculatePrice({
      sourcePrice: once.sellingPrice,
      markupPercent: "9",
    });
    expect(once.sellingPrice).toBe("1090.00");
    expect(wrong.sellingPrice).toBe("1189.00");
    // The engine's contract: callers must always pass the SOURCE price.
    expect(calculatePrice({ sourcePrice: "1000", markupPercent: "9" }).sellingPrice).toBe(
      "1090.00",
    );
  });

  it("is unaffected by the order of numeric vs string inputs", () => {
    const a = calculatePrice({ sourcePrice: 100, markupPercent: 9 });
    const b = calculatePrice({ sourcePrice: "100", markupPercent: "9" });
    expect(a).toEqual(b);
  });
});

describe("presets and custom markup", () => {
  it("defaults to 9%", () => {
    expect(DEFAULT_MARKUP_PERCENT).toBe(9);
    expect([...MARKUP_PRESETS]).toEqual([8, 9, 10]);
  });

  it("accepts a custom percentage with two decimals", () => {
    const r = calculatePrice({ sourcePrice: "1000", markupPercent: "8.55" });
    expect(r.markupBps).toBe(855);
    expect(r.calculatedSellingPrice).toBe("1085.50");
    expect(r.sellingPrice).toBe("1086.00");
  });

  it("rejects markup above 100%", () => {
    expect(() => calculatePrice({ sourcePrice: "100", markupPercent: "150" })).toThrow(
      PricingError,
    );
    expect(toMarkupBps("100")).toBe(10_000);
  });

  it("rejects negative or malformed values", () => {
    expect(() => calculatePrice({ sourcePrice: "-5", markupPercent: "9" })).toThrow();
    expect(() => calculatePrice({ sourcePrice: "abc", markupPercent: "9" })).toThrow();
    expect(() => calculatePrice({ sourcePrice: "", markupPercent: "9" })).toThrow();
    expect(() => calculatePrice({ sourcePrice: "100", markupPercent: undefined })).toThrow();
  });

  it("exposes stable error codes", () => {
    try {
      calculatePrice({ sourcePrice: "100", markupPercent: "-1" });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(PricingError);
      expect((e as PricingError).code).toBe("invalid_markup");
    }
  });
});

describe("manual override", () => {
  it("uses the override but still reports the calculated value", () => {
    const r = calculatePrice({
      sourcePrice: "1000",
      markupPercent: "9",
      overrideSellingPrice: "999",
    });
    expect(r.priceOverride).toBe(true);
    expect(r.calculatedSellingPrice).toBe("1090.00");
    expect(r.sellingPrice).toBe("999.00");
  });

  it("treats an empty override as absent", () => {
    const r = calculatePrice({
      sourcePrice: "1000",
      markupPercent: "9",
      overrideSellingPrice: "",
    });
    expect(r.priceOverride).toBe(false);
    expect(r.sellingPrice).toBe("1090.00");
  });

  it("rejects a non-numeric override", () => {
    expect(() =>
      calculatePrice({
        sourcePrice: "1000",
        markupPercent: "9",
        overrideSellingPrice: "cheap",
      }),
    ).toThrow(PricingError);
  });
});

describe("decideRecalculation", () => {
  const base = {
    sourcePrice: "1000.00",
    markupPercent: "9.00",
    sellingPrice: "1090.00",
    priceOverride: false,
  };

  it("does nothing when nothing changed", () => {
    const d = decideRecalculation(base, "1000.00", "9.00", "INR");
    expect(d.shouldRecalculate).toBe(false);
    expect(d.reason).toBe("unchanged");
  });

  it("recalculates when the verified source price changes", () => {
    const d = decideRecalculation(base, "1200.00", "9.00", "INR");
    expect(d.shouldRecalculate).toBe(true);
    expect(d.reason).toBe("source_reprice");
    expect(d.next?.sellingPrice).toBe("1308.00");
  });

  it("never recalculates over a manual override", () => {
    const d = decideRecalculation(
      { ...base, priceOverride: true, sellingPrice: "999.00" },
      "1200.00",
      "9.00",
      "INR",
      { recalcOnSourceChange: true, recalcOnGlobalMarkupChange: true },
    );
    expect(d.shouldRecalculate).toBe(false);
    expect(d.reason).toBe("manual_override_preserved");
  });

  it("respects a policy that freezes prices on source change", () => {
    const d = decideRecalculation(
      base,
      "1200.00",
      "9.00",
      "INR",
      { recalcOnSourceChange: false, recalcOnGlobalMarkupChange: false },
      "source_reprice",
    );
    expect(d.shouldRecalculate).toBe(false);
    expect(d.reason).toBe("unchanged");
  });

  it("keeps historic order totals untouched — recalculation only yields a new product price", () => {
    const d = decideRecalculation(base, "2000.00", "10.00", "INR");
    expect(d.next?.sellingPrice).toBe("2200.00");
    // The order snapshot is written at purchase time and is not derived from this.
    expect(d.next?.sourcePrice).toBe("2000.00");
  });
});
