// Exit (fade-out) and the animation window (ADR-0020). Pure: no browser; the
// frames are checked by the visual cases and the hello-world render.
import { describe, expect, it } from "vitest";
import { exitOpacity, enterFrames, windowFrames } from "../animations/curve.js";
import {
  animationStyle,
  combineStyles,
  exitStyle,
} from "../animations/index.js";
import { themeTokens } from "../themes/tokens.js";

const tokens = themeTokens("modern");
const D = 60;

/** The opacity fade-out draws at `frame` of a scene of D frames, with an optional window. */
const fadeAt = (frame: number, window?: number) =>
  exitStyle("fade-out", frame, D, tokens, false, window).opacity ?? NaN;

describe("fade-out curve", () => {
  it("is opaque before its window and transparent on the scene's last frame", () => {
    const window = windowFrames(D);
    expect(window).toBe(enterFrames(D));
    expect(fadeAt(D - window - 1)).toBe(1);
    expect(fadeAt(D - window)).toBe(1);
    expect(fadeAt(D - 1)).toBe(0);
  });

  it("falls monotonically over its window and stays within [0, 1]", () => {
    let previous = 1;
    for (let frame = D - windowFrames(D); frame < D; frame++) {
      const value = fadeAt(frame);
      expect(value).toBeLessThanOrEqual(previous);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
      previous = value;
    }
  });

  it("uses an animationDuration as the exact length of its window", () => {
    // 15 frames: the window is frames 45 to 59 of 60.
    expect(fadeAt(44, 15)).toBe(1);
    expect(fadeAt(45, 15)).toBe(1);
    expect(fadeAt(46, 15)).toBeLessThan(1);
    expect(fadeAt(59, 15)).toBe(0);
  });

  it("draws a scene shorter than minFrames as it is, at every frame", () => {
    for (let frame = 0; frame < 14; frame++) {
      expect(exitOpacity(frame, 14, 15)).toBe(1);
    }
  });

  it("is the scene as it is under reduced motion (the static rule)", () => {
    for (const frame of [0, 40, 45, 59]) {
      expect(exitStyle("fade-out", frame, D, tokens, true)).toEqual({});
    }
  });

  it("rejects an unknown exit before drawing", () => {
    expect(() => exitStyle("spin", 0, D, tokens)).toThrow(
      'unknown exit "spin" (known: fade-out)',
    );
  });
});

describe("animationDuration on the entrance", () => {
  it("sets the entrance window: the end state from the window's length on", () => {
    const at = (frame: number, window?: number) =>
      animationStyle("fade-in", frame, D, tokens, false, window).opacity;
    expect(at(15, 15)).toBe(1);
    expect(at(14, 15)).toBeLessThan(1);
    // The default window (20 frames for 60) is still longer.
    expect(at(15)).toBeLessThan(1);
  });
});

describe("entrance and exit together", () => {
  it("multiplies the opacities of an entrance and an exit", () => {
    expect(combineStyles({ opacity: 0.5 }, { opacity: 0.5 })).toEqual({
      opacity: 0.25,
    });
  });

  it("keeps the one style that is set when only one of them is", () => {
    expect(combineStyles({ opacity: 0.4 }, {})).toEqual({ opacity: 0.4 });
    expect(combineStyles({}, { opacity: 0.6 })).toEqual({ opacity: 0.6 });
    expect(combineStyles({}, {})).toEqual({});
  });
});
