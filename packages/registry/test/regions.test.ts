// Regions of split-screen (task 043; ADR-0016): the shipped contract, the rules
// that tie `regions` to the region placement, and the column geometry the
// renderer and the validator share (`splitColumns`, `regionColumns`).
import { describe, expect, it } from "vitest";
import { getComponent, getTheme, parseContract } from "../src/index.js";
import {
  REGION_ORDER,
  regionColumns,
  safeBox,
  splitColumns,
  type Rect,
} from "../src/layout.js";

const modern = getTheme("modern");

/** A valid split-screen-like contract; tests change one field at a time. */
function contract(): Record<string, unknown> {
  return {
    id: "regions",
    version: "1.0.0",
    purpose: "A sample component with regions, used by the region tests.",
    slots: {
      left: { required: false, accepts: ["paragraph"] },
      right: { required: false, accepts: ["paragraph"] },
    },
    props: {},
    placements: ["region"],
    regions: { min: 2, max: 2 },
    compatibleAnimations: [],
    compatibleTransitions: [],
    duration: { minMs: 1000, maxMs: 5000 },
    accessibility: "Text and footage.",
  };
}

function parse(value: Record<string, unknown>): void {
  parseContract(JSON.stringify(value), "regions.json");
}

/** True when the two rectangles share any pixel. */
function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.left < b.left + b.width &&
    b.left < a.left + a.width &&
    a.top < b.top + b.height &&
    b.top < a.top + a.height
  );
}

describe("split-screen contract", () => {
  it("has the three regions as slots, the region placement and 2 to 3 regions", () => {
    const component = getComponent("split-screen");
    expect(Object.keys(component.slots).sort()).toEqual(
      [...REGION_ORDER].sort(),
    );
    expect(component.placements).toEqual(["region"]);
    expect(component.regions).toEqual({ min: 2, max: 3 });
    expect(component.requiresMedia).not.toBe(true);
  });
});

describe("regions in a contract", () => {
  it("accepts a contract whose regions and region placement agree", () => {
    expect(() => parse(contract())).not.toThrow();
  });

  it("rejects regions without the region placement", () => {
    const value = { ...contract(), placements: [] };
    expect(() => parse(value)).toThrow(/both be set or both absent/);
  });

  it("rejects the region placement without regions", () => {
    const value = contract();
    delete value["regions"];
    expect(() => parse(value)).toThrow(/both be set or both absent/);
  });

  it("rejects a minimum above the maximum", () => {
    const value = { ...contract(), regions: { min: 2, max: 1 } };
    expect(() => parse(value)).toThrow(/max \(1\) is below min \(2\)/);
  });

  it("rejects a maximum above the number of slots", () => {
    const value = { ...contract(), regions: { min: 1, max: 3 } };
    expect(() => parse(value)).toThrow(/above the number of slots \(2\)/);
  });

  it("rejects a zero minimum and unknown keys in regions", () => {
    expect(() =>
      parse({ ...contract(), regions: { min: 0, max: 2 } }),
    ).toThrow();
    expect(() =>
      parse({ ...contract(), regions: { min: 1, max: 2, gap: 4 } }),
    ).toThrow();
  });
});

describe("splitColumns", () => {
  const area: Rect = { left: 40, top: 30, width: 1000, height: 500 };

  for (const count of [1, 2, 3]) {
    it(`splits the area into ${count} column(s) that lie inside it and never overlap`, () => {
      const columns = splitColumns(area, count, 32);
      expect(columns).toHaveLength(count);
      for (const column of columns) {
        expect(column.top).toBe(area.top);
        expect(column.height).toBe(area.height);
        expect(column.left).toBeGreaterThanOrEqual(area.left);
        expect(column.left + column.width).toBeLessThanOrEqual(
          area.left + area.width,
        );
      }
      for (let i = 0; i < columns.length; i += 1) {
        for (let j = i + 1; j < columns.length; j += 1) {
          expect(overlaps(columns[i]!, columns[j]!)).toBe(false);
        }
      }
    });
  }

  it("leaves exactly the gap between neighbours and gives the remainder to the last column", () => {
    const columns = splitColumns(
      { left: 0, top: 0, width: 1002, height: 10 },
      3,
      10,
    );
    expect(columns.map((c) => c.width)).toEqual([327, 327, 328]);
    expect(columns[1]!.left - (columns[0]!.left + columns[0]!.width)).toBe(10);
    expect(columns[2]!.left - (columns[1]!.left + columns[1]!.width)).toBe(10);
    expect(columns[2]!.left + columns[2]!.width).toBe(1002);
  });
});

describe("regionColumns", () => {
  const sizes: Array<[number, number]> = [
    [640, 360],
    [1920, 1080],
    [1080, 1920],
  ];

  for (const [width, height] of sizes) {
    for (const count of [2, 3]) {
      it(`places ${count} regions inside the canvas safe area on ${width}x${height}`, () => {
        const box = safeBox(modern, width, height);
        const columns = regionColumns(modern, width, height, count);
        expect(columns).toHaveLength(count);
        const total = columns.reduce((sum, column) => sum + column.width, 0);
        expect(total).toBe(box.width - modern.space.md * (count - 1));
        for (let i = 0; i < columns.length; i += 1) {
          expect(columns[i]!.width).toBeGreaterThan(0);
          for (let j = i + 1; j < columns.length; j += 1) {
            expect(overlaps(columns[i]!, columns[j]!)).toBe(false);
          }
        }
      });
    }
  }
});
