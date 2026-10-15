// Layout arithmetic shared by the validator and the renderer (task 025):
// line counting, the fit rule within a theme's type scale, and safe-area margins.
import { describe, expect, it } from "vitest";
import { getTheme } from "../src/index.js";
import { countLines, fitText, safeAreaPixels, safeBox } from "../src/layout.js";

const modern = getTheme("modern");
const range = { max: "title", min: "body" } as const;

describe("countLines", () => {
  it("wraps words at spaces and counts each newline", () => {
    expect(countLines("one two three", 7)).toBe(2);
    expect(countLines("one\ntwo", 20)).toBe(2);
    expect(countLines("", 10)).toBe(0);
  });

  it("breaks a word longer than a line across lines", () => {
    expect(countLines("abcdefghij", 4)).toBe(3);
  });
});

describe("fitText", () => {
  it("keeps the largest size in the range when the text fits", () => {
    const fit = fitText("Short.", { width: 1690, height: 908 }, modern, range);
    expect(fit).toEqual({ fontPx: 96, lines: 1, fits: true });
  });

  it("scales a three-line statement down, within the range", () => {
    const text = "Small frames shrink a statement to fit three lines inside.";
    const fit = fitText(text, { width: 564, height: 302 }, modern, range);
    expect(fit.fits).toBe(true);
    expect(fit.fontPx).toBeLessThan(96);
    expect(fit.fontPx).toBeGreaterThanOrEqual(modern.typography.scale.body);
    expect(fit.lines * fit.fontPx * 1.1).toBeLessThanOrEqual(302);
  });

  it("reports no fit at the minimum size when the text is too long", () => {
    const text = "word ".repeat(200);
    const fit = fitText(text, { width: 564, height: 302 }, modern, range);
    expect(fit.fits).toBe(false);
    expect(fit.fontPx).toBe(modern.typography.scale.body);
  });

  it("fits empty text at the largest size", () => {
    expect(fitText("", { width: 10, height: 10 }, modern, range).fits).toBe(
      true,
    );
  });
});

describe("safe area", () => {
  it("gives 16:9 frames the 16:9 margins of the theme", () => {
    expect(safeAreaPixels(modern, 1920, 1080)).toEqual({ x: 115, y: 86 });
    expect(safeBox(modern, 1920, 1080)).toEqual({ width: 1690, height: 908 });
  });
});
