// The value curves of the animation presets (PRD §5.6; task 021): the start and
// end states, monotone progress, the end state reached by the last frame, the
// short-scene fallback, and determinism (the same frame gives the same style).
import { describe, expect, it } from "vitest";
import {
  getAnimation,
  listAnimations,
  type ThemeTokens,
} from "@quarto-video/registry";
import { animationIds, animationStyle } from "../animations/index.js";
import { enterFrames, easeOut } from "../animations/curve.js";
import { themeTokens } from "../themes/tokens.js";

const tokens: ThemeTokens = themeTokens("modern");
const IDS = animationIds();
const style = (name: string, frame: number, duration: number) =>
  animationStyle(name, frame, duration, tokens);
const endState = (name: string, duration: number) =>
  style(name, 1_000_000, duration);

/** Durations from each preset's minimum up to a full minute at 30 fps. */
const durations = (min: number): number[] => [
  ...Array.from({ length: 300 }, (_, i) => min + i),
  1000,
  1800,
  3600,
];

describe("entrance timing", () => {
  it("takes a third of the scene, at least one frame, at most 30", () => {
    expect(enterFrames(1)).toBe(1);
    expect(enterFrames(15)).toBe(5);
    expect(enterFrames(90)).toBe(30);
    expect(enterFrames(3600)).toBe(30);
  });

  it("eases out: starts at 0, ends at 1, and is above the linear line", () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
    expect(easeOut(0.5)).toBeGreaterThan(0.5);
  });
});

describe("fade-in", () => {
  it("is transparent at the first frame and opaque at the end of the entrance", () => {
    expect(style("fade-in", 0, 90)).toEqual({ opacity: 0 });
    expect(style("fade-in", enterFrames(90), 90)).toEqual({ opacity: 1 });
  });

  it("rises monotonically through the entrance", () => {
    const values = Array.from(
      { length: 30 },
      (_, f) => style("fade-in", f, 90).opacity ?? NaN,
    );
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(values[1]).toBeGreaterThan(0);
    expect(values[1]).toBeLessThan(1);
  });
});

describe("slide-up", () => {
  it("starts transparent and one large space token below its place", () => {
    expect(style("slide-up", 0, 90)).toEqual({
      opacity: 0,
      transform: `translateY(${tokens.space.lg}px)`,
    });
  });

  it("ends opaque at its place", () => {
    expect(style("slide-up", 90, 90)).toEqual({
      opacity: 1,
      transform: "translateY(0px)",
    });
  });

  it("takes its distance from the theme's space tokens", () => {
    const bigger = { ...tokens, space: { ...tokens.space, lg: 200 } };
    expect(animationStyle("slide-up", 0, 90, bigger).transform).toBe(
      "translateY(200px)",
    );
  });
});

describe("reveal", () => {
  it("is transparent and 96% size at the first frame, opaque and full size at the end", () => {
    expect(style("reveal", 0, 90)).toEqual({
      opacity: 0,
      transform: "scale(0.96)",
    });
    expect(style("reveal", enterFrames(90), 90)).toEqual({
      opacity: 1,
      transform: "scale(1)",
    });
  });

  it("never clips or masks: only opacity and scale, at every frame", () => {
    for (const duration of [15, 45, 90, 300]) {
      for (let frame = 0; frame < duration; frame += 1) {
        const drawn = style("reveal", frame, duration);
        expect(Object.keys(drawn).sort()).toEqual(["opacity", "transform"]);
        expect(drawn.transform).toMatch(/^scale\([\d.]+\)$/);
      }
    }
  });

  it("grows and rises in opacity monotonically, within [0.96, 1]", () => {
    const frames = Array.from({ length: 30 }, (_, f) => f);
    const opacity = frames.map((f) => style("reveal", f, 90).opacity ?? NaN);
    const scale = frames.map((f) =>
      Number(
        /^scale\(([\d.]+)\)$/.exec(style("reveal", f, 90).transform ?? "")?.[1],
      ),
    );
    expect(opacity).toEqual([...opacity].sort((a, b) => a - b));
    expect(scale).toEqual([...scale].sort((a, b) => a - b));
    for (const value of scale) {
      expect(value).toBeGreaterThanOrEqual(0.96);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("is distinct from fade-in and slide-up during the entrance", () => {
    expect(style("reveal", 7, 90)).not.toEqual(style("fade-in", 7, 90));
    expect(style("reveal", 7, 90)).not.toEqual(style("slide-up", 7, 90));
    expect(style("reveal", 7, 90).transform).not.toMatch(/translate/);
  });
});

describe.each(IDS)("%s", (name) => {
  const { minFrames } = getAnimation(name);

  it("reaches its end state no later than the scene's last frame", () => {
    for (const duration of durations(minFrames)) {
      const end = endState(name, duration);
      const first = Array.from({ length: duration }, (_, f) => f).find(
        (f) => JSON.stringify(style(name, f, duration)) === JSON.stringify(end),
      );
      expect(first, `duration ${duration}`).toBeDefined();
      expect(first ?? Infinity).toBeLessThanOrEqual(duration - 1);
    }
  });

  it("shows the end state from the first frame below its minimum", () => {
    for (let duration = 1; duration < minFrames; duration += 1) {
      const end = endState(name, duration);
      for (let frame = 0; frame < duration; frame += 1) {
        expect(style(name, frame, duration)).toEqual(end);
      }
    }
  });

  it("gives the same style for the same frame, in any order", () => {
    const frames = Array.from({ length: 200 }, (_, f) => f);
    const forward = frames.map((f) => style(name, f, 150));
    const backward = [...frames].reverse().map((f) => style(name, f, 150));
    expect(backward.reverse()).toEqual(forward);
    expect(style(name, 40, 150)).toEqual(style(name, 40, 150));
  });
});

describe("preset API", () => {
  it("has a frame function for every registry preset, and no others", () => {
    expect(IDS).toEqual(listAnimations().map((p) => p.id));
  });

  it("throws for a name the renderer does not know", () => {
    expect(() => style("spin", 0, 90)).toThrow(
      'unknown animation "spin" (known: count-up, fade-in, kinetic, reveal, slide-up, stagger)',
    );
  });
});
