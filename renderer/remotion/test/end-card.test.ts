// The end-card credits fit the safe area (task 030): the preferred size while
// the lines fit, and a smaller size that always fits when the list is longer.
import { describe, expect, it } from "vitest";
import { creditsFontSize } from "../components/end-card/EndCard.js";
import { themeTokens } from "../themes/tokens.js";
import { safeAreaPixels } from "../themes/safe-area.js";

const modern = themeTokens("modern");
const LINE = modern.typography.lineHeight.body;
const CAPTION = modern.typography.scale.caption;

/** The credits budget of a 1920x1080 frame, as EndCard computes it. */
const margin = safeAreaPixels(modern, 1920, 1080);
const BUDGET = (1080 - 2 * margin.y) * 0.5;

describe("end-card credits size", () => {
  it("keeps the caption size for ten lines at 1080p", () => {
    expect(creditsFontSize(CAPTION, LINE, 10, BUDGET)).toBe(CAPTION);
  });

  it("sets a longer list smaller so that every line fits the budget", () => {
    for (const lines of [12, 16, 24, 40]) {
      const size = creditsFontSize(CAPTION, LINE, lines, BUDGET);
      expect(size).toBeLessThan(CAPTION);
      expect(size * LINE * lines).toBeLessThanOrEqual(BUDGET);
    }
  });

  it("never goes below one pixel and ignores an empty list", () => {
    expect(creditsFontSize(CAPTION, LINE, 10_000, BUDGET)).toBe(1);
    expect(creditsFontSize(CAPTION, LINE, 0, BUDGET)).toBe(CAPTION);
  });
});
