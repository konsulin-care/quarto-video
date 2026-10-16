// Layout arithmetic shared by the validator and the renderer (task 025):
// line counting, the fit rule within a theme's type scale, and safe-area margins.
import { describe, expect, it } from "vitest";
import { getTheme } from "../src/index.js";
import {
  countLines,
  fitStack,
  fitText,
  safeAreaPixels,
  safeBox,
} from "../src/layout.js";

const modern = getTheme("modern");
const range = { max: "title", min: "body" } as const;
const stackRange = {
  max: "title",
  min: "body",
  subtitle: { max: "subtitle", min: "body" },
} as const;
/** About one hundred characters: runs past a 640x360 frame at 96px. */
const longTitle =
  "The opening title of a video can run to about one hundred characters, so it must scale down to fit";
const small = safeBox(modern, 640, 360);

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

describe("fitStack", () => {
  it("keeps a short title and subtitle at their largest sizes", () => {
    expect(
      fitStack(
        { default: "Welcome", subtitle: "Sub" },
        small,
        modern,
        stackRange,
      ),
    ).toEqual({
      default: { fontPx: 96, lines: 1, fits: true },
      subtitle: { fontPx: 56, lines: 1, fits: true },
    });
  });

  it("scales a title of about 100 characters down at 640x360, within the range", () => {
    const fit = fitStack(
      { default: longTitle, subtitle: "" },
      small,
      modern,
      stackRange,
    );
    expect(fit).toEqual({ default: { fontPx: 45, lines: 6, fits: true } });
    expect(fit.default.lines * fit.default.fontPx * 1.1).toBeLessThanOrEqual(
      small.height,
    );
  });

  it("fits the title and the subtitle beside it, the title first", () => {
    const fit = fitStack(
      { default: longTitle, subtitle: "A short subtitle." },
      small,
      modern,
      stackRange,
    );
    expect(fit).toEqual({
      default: { fontPx: 41, lines: 5, fits: true },
      subtitle: { fontPx: 43, lines: 1, fits: true },
    });
    const used =
      fit.default.lines * fit.default.fontPx * 1.1 +
      16 +
      (fit.subtitle?.lines ?? 0) * (fit.subtitle?.fontPx ?? 0) * 1.4;
    expect(used).toBeLessThanOrEqual(small.height);
  });

  it("reports the subtitle when it cannot sit beside a title at its minimum", () => {
    const fit = fitStack(
      {
        default: longTitle,
        subtitle: "A subtitle that is too long to sit beside the title.",
      },
      small,
      modern,
      stackRange,
    );
    expect(fit.default).toEqual({ fontPx: 40, lines: 5, fits: true });
    expect(fit.subtitle?.fits).toBe(false);
  });

  it("reports the title when it overflows alone at its minimum", () => {
    const fit = fitStack(
      { default: "word ".repeat(200), subtitle: "Sub" },
      small,
      modern,
      stackRange,
    );
    expect(fit.default).toEqual({
      fontPx: 40,
      lines: expect.any(Number),
      fits: false,
    });
  });

  it("gives the title the whole box when the range has no subtitle", () => {
    const plain = fitStack(
      { default: longTitle, subtitle: "A short subtitle." },
      small,
      modern,
      range,
    );
    expect(plain).toEqual({
      default: fitText(longTitle, small, modern, range),
    });
  });

  it("is deterministic for the same input", () => {
    const input = { default: longTitle, subtitle: "A short subtitle." };
    expect(fitStack(input, small, modern, stackRange)).toEqual(
      fitStack(input, small, modern, stackRange),
    );
  });
});
