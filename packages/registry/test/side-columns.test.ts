// The text and footage columns of text-media (task 042): they lie inside the
// area, never overlap, and `side` swaps them.
import { describe, expect, it } from "vitest";
import { getTheme } from "../src/index.js";
import { safeBox, sideColumns, type Rect } from "../src/layout.js";

const modern = getTheme("modern");

/** True when the two rectangles share any pixel. */
function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.left < b.left + b.width &&
    b.left < a.left + a.width &&
    a.top < b.top + b.height &&
    b.top < a.top + a.height
  );
}

/** True when `inner` lies inside `outer`. */
function inside(inner: Rect, outer: Rect): boolean {
  return (
    inner.left >= outer.left &&
    inner.top >= outer.top &&
    inner.left + inner.width <= outer.left + outer.width &&
    inner.top + inner.height <= outer.top + outer.height
  );
}

describe("sideColumns", () => {
  it.each([
    [640, 360],
    [1920, 1080],
    [360, 640],
    [640, 480],
    [641, 361],
  ])("keeps the columns apart and inside the safe box at %ix%i", (w, h) => {
    const area = { ...safeBox(modern, w, h), left: 0, top: 0 };
    for (const side of ["left", "right"] as const) {
      const { text, media } = sideColumns(area, side, modern.space.md);
      expect(overlaps(text, media)).toBe(false);
      expect(inside(text, area)).toBe(true);
      expect(inside(media, area)).toBe(true);
    }
  });

  it("puts the footage on the given side and the text on the other", () => {
    const area: Rect = { left: 40, top: 20, width: 560, height: 320 };
    const left = sideColumns(area, "left", 32);
    const right = sideColumns(area, "right", 32);
    expect(left.media.left).toBe(area.left);
    expect(right.text).toEqual(left.media);
    expect(right.media).toEqual(left.text);
    expect(left.text.left + left.text.width).toBe(area.left + area.width);
  });

  it("gives the two columns equal widths when the width is even", () => {
    const area: Rect = { left: 0, top: 0, width: 560, height: 300 };
    const { text, media } = sideColumns(area, "right", 32);
    expect(text.width).toBe(media.width);
    expect(text.width).toBe(264);
  });
});
