// The chart's value axis (task 035): zero is always in range, ticks are 1, 2 or
// 5 times a power of ten, and the same values always give the same ticks.
import { describe, expect, it } from "vitest";
import { niceScale } from "../components/chart/scale.js";
import { layoutPlot } from "../components/chart/layout.js";

describe("niceScale", () => {
  it("starts the axis at zero for positive values and steps by 1, 2 or 5", () => {
    expect(niceScale([120, 95.5, 140])).toEqual({
      lo: 0,
      hi: 150,
      ticks: [0, 50, 100, 150],
    });
    expect(niceScale([0.2, 0.7])).toEqual({
      lo: 0,
      hi: 0.8,
      ticks: [0, 0.2, 0.4, 0.6, 0.8],
    });
  });

  it("keeps zero in range for negative values", () => {
    const scale = niceScale([-30, 10]);
    expect(scale.lo).toBeLessThanOrEqual(-30);
    expect(scale.hi).toBeGreaterThanOrEqual(10);
    expect(scale.ticks).toContain(0);
  });

  it("gives a usable axis for a flat series", () => {
    const scale = niceScale([0, 0]);
    expect(scale.hi).toBeGreaterThan(scale.lo);
  });

  it("is a pure function of the values", () => {
    expect(niceScale([340, 604, 276])).toEqual(niceScale([340, 604, 276]));
  });
});

describe("layoutPlot", () => {
  const scale = niceScale([1, 2, 3]);
  const base = {
    width: 1600,
    height: 800,
    font: 28,
    tickWidth: 20,
    scale,
  };

  it("keeps the top of the scale at the top of the plot", () => {
    const plot = layoutPlot({ ...base, labels: ["a", "b", "c"] });
    expect(plot.yOf(scale.hi)).toBe(plot.top);
    expect(plot.yOf(scale.lo)).toBe(plot.bottom);
  });

  it("centres each category in its slot", () => {
    const plot = layoutPlot({ ...base, labels: ["a", "b", "c", "d"] });
    expect(plot.xOf(1) - plot.xOf(0)).toBeCloseTo(plot.slot);
    expect(plot.xOf(0) - plot.left).toBeCloseTo(plot.slot / 2);
  });

  it("turns the labels when they would overlap, and not when they fit", () => {
    const short = layoutPlot({ ...base, labels: Array(12).fill("Jan") });
    expect(short.rotated).toBe(false);
    const long = layoutPlot({
      ...base,
      width: 640,
      labels: Array(12).fill("Week number twelve"),
    });
    expect(long.rotated).toBe(true);
  });
});
