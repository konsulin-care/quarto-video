// Number text and number size of the statistic component (task 031, ADR-0015):
// the documented separators, rounding, the sign of a value that rounds to
// zero, and the size that keeps a long number inside the safe-area width.
import { describe, expect, it } from "vitest";
import { MAX_DECIMALS, formatNumber } from "../components/statistic/format.js";
import { numberFontPx } from "../components/statistic/size.js";

describe("formatNumber", () => {
  it("groups a large value in threes with a comma (1e9 shows 1,000,000,000)", () => {
    expect(formatNumber(1e9, 0)).toBe("1,000,000,000");
    expect(formatNumber(1e15, 0)).toBe("1,000,000,000,000,000");
  });

  it("uses a full stop as the decimal mark and keeps the digits asked for", () => {
    expect(formatNumber(1234.5, 1)).toBe("1,234.5");
    expect(formatNumber(1234.5, 3)).toBe("1,234.500");
    expect(formatNumber(0.5, 2)).toBe("0.50");
  });

  it("does not group a number below one thousand", () => {
    expect(formatNumber(999, 0)).toBe("999");
    expect(formatNumber(42, 0)).toBe("42");
  });

  it("rounds half away from zero, as toFixed does", () => {
    expect(formatNumber(2.5, 0)).toBe("3");
    expect(formatNumber(0.125, 2)).toBe("0.13");
    expect(formatNumber(-2.5, 0)).toBe("-3");
    expect(formatNumber(999.9999, 2)).toBe("1,000.00");
  });

  it("writes a minus sign for a negative value, grouped", () => {
    expect(formatNumber(-1234567, 0)).toBe("-1,234,567");
    expect(formatNumber(-0.5, 1)).toBe("-0.5");
  });

  it("drops the sign of a value that rounds to zero", () => {
    expect(formatNumber(-0.001, 2)).toBe("0.00");
    expect(formatNumber(-0, 0)).toBe("0");
  });

  it("allows up to MAX_DECIMALS decimals, the contract's maximum", () => {
    expect(MAX_DECIMALS).toBe(6);
    expect(formatNumber(1 / 3, MAX_DECIMALS)).toBe("0.333333");
  });
});

describe("numberFontPx", () => {
  const parts = (digits: string, prefix = "", unit = "") => ({
    prefix,
    digits,
    unit,
  });

  it("draws a short number at the largest size", () => {
    expect(numberFontPx(parts("42"), 1689, 192, 40)).toBe(192);
  });

  it("shrinks a long number so it fits the width", () => {
    const px = numberFontPx(parts("1,000,000,000,000,000"), 1689, 192, 40);
    expect(px).toBeLessThan(192);
    expect(px * 0.6 * "1,000,000,000,000,000".length).toBeLessThanOrEqual(1689);
  });

  it("never draws below the minimum size", () => {
    expect(numberFontPx(parts("1".repeat(200)), 400, 192, 40)).toBe(40);
  });

  it("counts a unit at half a glyph: 20 digits and 20 unit letters fit like 30 digits", () => {
    const withUnit = numberFontPx(
      parts("1".repeat(20), "", "x".repeat(20)),
      1000,
      192,
      1,
    );
    expect(withUnit).toBe(numberFontPx(parts("1".repeat(30)), 1000, 192, 1));
  });
});
