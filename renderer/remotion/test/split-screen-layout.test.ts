// split-screen (task 043; ADR-0016): the regions drawn, in the order of the canvas,
// are the ones the contract names; the columns they take never overlap and lie in
// the canvas safe area. Pure: no browser.
import { getComponent, getTheme } from "@quarto-video/registry";
import {
  REGION_ORDER,
  regionColumns,
  safeBox,
  type Rect,
} from "@quarto-video/registry/layout";
import { describe, expect, it } from "vitest";
import {
  drawnRegions,
  regionFontPx,
  sharedTextPx,
} from "../components/split-screen/regions.js";
import { REGION_TEXT_FIT } from "../components/split-screen/SplitScreen.js";

const modern = getTheme("modern");
const FOOTAGE = { type: "video" };

function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.left < b.left + b.width &&
    b.left < a.left + a.width &&
    a.top < b.top + b.height &&
    b.top < a.top + a.height
  );
}

describe("split-screen regions", () => {
  it("has the contract's slots as its regions, in REGION_ORDER", () => {
    expect(Object.keys(getComponent("split-screen").slots)).toEqual(
      expect.arrayContaining([...REGION_ORDER]),
    );
    expect(Object.keys(getComponent("split-screen").slots)).toHaveLength(
      REGION_ORDER.length,
    );
  });

  it("draws the regions with text or footage, left to right", () => {
    expect(drawnRegions({ right: "B", left: "A" }, {})).toEqual([
      "left",
      "right",
    ]);
    expect(drawnRegions({ right: "B" }, { middle: FOOTAGE })).toEqual([
      "middle",
      "right",
    ]);
    expect(drawnRegions({ left: "A", middle: "", right: "" }, {})).toEqual([
      "left",
    ]);
  });

  it("draws nothing for a scene with no region content", () => {
    expect(drawnRegions({}, {})).toEqual([]);
  });

  it("keeps a long word whole: its size is at most the width its longest letters take", () => {
    const box = { left: 0, top: 0, width: 500, height: 300 };
    const size = regionFontPx(
      "Antidisestablishment",
      box,
      modern,
      REGION_TEXT_FIT,
    );
    // 20 characters at 0.6 em each must fit 500 px: 41 px at most, and never below body (40).
    expect(size).toBeLessThanOrEqual(41);
    expect(size).toBeGreaterThanOrEqual(modern.typography.scale.body);
  });

  it("gives every text region of a scene the smallest size any of them fits", () => {
    // Short enough that the long text wraps past the height at the largest size.
    const box = { left: 0, top: 0, width: 500, height: 120 };
    const short = { text: "Hi", box };
    const long = {
      text: "A much longer line of words that must wrap in its column",
      box,
    };
    const shared = sharedTextPx([short, long], modern, REGION_TEXT_FIT);
    expect(shared).toBe(
      Math.min(
        regionFontPx("Hi", box, modern, REGION_TEXT_FIT),
        regionFontPx(long.text, box, modern, REGION_TEXT_FIT),
      ),
    );
    expect(shared).toBeLessThan(
      regionFontPx("Hi", box, modern, REGION_TEXT_FIT),
    );
  });

  for (const [width, height] of [
    [640, 360],
    [1920, 1080],
    [1080, 1920],
    [1000, 1000],
  ] as const) {
    for (const count of [2, 3]) {
      it(`gives ${count} drawn regions columns that never overlap on ${width}x${height}`, () => {
        const box = safeBox(modern, width, height);
        const columns = regionColumns(modern, width, height, count);
        expect(columns).toHaveLength(count);
        for (let i = 0; i < count; i += 1) {
          const column = columns[i]!;
          expect(column.width).toBeGreaterThan(0);
          expect(column.height).toBe(box.height);
          for (let j = i + 1; j < count; j += 1) {
            expect(overlaps(column, columns[j]!)).toBe(false);
          }
        }
      });
    }
  }
});
