// Safe-area margins come from the theme's declared aspect ratios (PRD §10.2).
import { describe, expect, it } from "vitest";
import { getTheme } from "@quarto-video/registry";
import { safeAreaPixels } from "../themes/safe-area.js";

const MODERN = getTheme("modern");

describe("safe area", () => {
  it("uses the 16:9 margins for a 1920x1080 frame", () => {
    // 6% of 1920 and 8% of 1080.
    expect(safeAreaPixels(MODERN, 1920, 1080)).toEqual({ x: 115, y: 86 });
  });

  it("uses the nearest declared ratio for a 9:16 frame", () => {
    expect(safeAreaPixels(MODERN, 1080, 1920)).toEqual({ x: 86, y: 115 });
  });

  it("uses the 1:1 margins for a square frame", () => {
    expect(safeAreaPixels(MODERN, 1000, 1000)).toEqual({ x: 70, y: 70 });
  });

  it("uses the nearest declared ratio for an unlisted one", () => {
    // 5:4 is nearer to 1:1 than to 16:9: 7% of 1000 and 7% of 800.
    expect(safeAreaPixels(MODERN, 1000, 800)).toEqual({ x: 70, y: 56 });
  });
});
