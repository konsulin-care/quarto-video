// The count-up preset's schedule (PRD §5.6, §12; task 032): deterministic, the
// count rises from zero and never passes the value, the exact value (formatted
// as the statistic formats it) is shown from ceil(0.7 * duration) on, and a
// reduced or short scene shows the value from its first frame. The value
// generator is seeded, so every run checks the same values.
import { describe, expect, it } from "vitest";
import { getAnimation } from "@quarto-video/registry";
import {
  countUp,
  countUpValue,
  countSettleFrame,
} from "../animations/count-up.js";
import { countedValue, type CountMotion } from "../animations/count-motion.js";
import { formatNumber } from "../components/statistic/format.js";
import { themeTokens } from "../themes/tokens.js";

const MIN = getAnimation("count-up").minFrames;
/** Scene lengths from the minimum to a minute at 30 fps, and a few long ones. */
const durations = [45, 46, 60, 74, 90, 91, 150, 299, 1800];
const DECIMALS = [0, 1, 2, 3, 6];

/** A seeded linear congruential generator: the same values in every run. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

const rand = seeded(20261015);
const generated = Array.from(
  { length: 60 },
  () => Math.round((rand() * 2 - 1) * 1e9 * 1000) / 1000,
);
/** Fixed cases (zero, signs, the decimals of the statistic docs) and generated values. */
const values = [
  0,
  1,
  -1,
  0.5,
  42,
  -3.456,
  98.5,
  1234.5678,
  1e9,
  -1e9,
  0.001,
  999999.5,
  ...generated,
];

const frameRange = (duration: number) =>
  Array.from({ length: duration }, (_, frame) => frame);

describe("count-up schedule", () => {
  it("settles at ceil(0.7 * duration)", () => {
    expect(countSettleFrame(90)).toBe(63);
    expect(countSettleFrame(91)).toBe(64);
    expect(countSettleFrame(45)).toBe(32);
  });

  it("starts from zero at frame 0 for every value and length", () => {
    for (const value of values) {
      for (const duration of durations) {
        expect(countUpValue(value, 0, duration) === 0).toBe(true);
      }
    }
  });

  it("shows the exact value from the settle frame to the last frame", () => {
    for (const value of values) {
      for (const duration of durations) {
        for (
          let frame = countSettleFrame(duration);
          frame < duration;
          frame += 1
        ) {
          expect(countUpValue(value, frame, duration)).toBe(value);
        }
      }
    }
  });

  it("shows the formatted final value, as the statistic formats it, from the settle frame on", () => {
    for (const value of values) {
      for (const decimals of DECIMALS) {
        const final = formatNumber(value, decimals);
        for (const duration of [90, 151]) {
          for (
            let frame = countSettleFrame(duration);
            frame < duration;
            frame += 1
          ) {
            const shown = countUpValue(value, frame, duration);
            expect(formatNumber(shown, decimals)).toBe(final);
          }
        }
      }
    }
  });

  it("never passes the value: a positive count rises to it, a negative one falls to it", () => {
    for (const value of values) {
      for (const duration of durations) {
        const shown = frameRange(duration).map((frame) =>
          countUpValue(value, frame, duration),
        );
        for (const x of shown) {
          if (value >= 0) expect(x >= 0 && x <= value).toBe(true);
          else expect(x <= 0 && x >= value).toBe(true);
        }
        const sorted = [...shown].sort((a, b) => (value >= 0 ? a - b : b - a));
        expect(shown).toEqual(sorted);
      }
    }
  });

  it("is monotonic in the formatted text too, at every decimal count", () => {
    for (const value of values) {
      for (const decimals of DECIMALS) {
        const magnitudes = frameRange(90).map((frame) =>
          Math.abs(
            Number(
              formatNumber(countUpValue(value, frame, 90), decimals).replace(
                /,/g,
                "",
              ),
            ),
          ),
        );
        expect(magnitudes).toEqual([...magnitudes].sort((a, b) => a - b));
      }
    }
  });

  it("eases out: past half the value by halfway through the count", () => {
    // 90 frames settle at 63; frame 31 is about halfway through the count.
    expect(countUpValue(100, 31, 90)).toBeGreaterThan(50);
    expect(countUpValue(100, 31, 90)).toBeLessThan(100);
  });

  it("is between zero and the value while counting (non-zero values)", () => {
    for (const value of values.filter((v) => v !== 0)) {
      for (let frame = 1; frame < countSettleFrame(90); frame += 1) {
        const x = countUpValue(value, frame, 90);
        expect(x).not.toBe(value);
        expect(x).not.toBe(0);
      }
    }
  });

  it("is deterministic: the same frame gives the same value, in any order of calls", () => {
    for (const value of values) {
      for (const duration of [45, 90, 151]) {
        const frames = frameRange(duration);
        const first = frames.map((f) => countUpValue(value, f, duration));
        const reversed = [...frames]
          .reverse()
          .map((f) => countUpValue(value, f, duration));
        expect(reversed.reverse()).toEqual(first);
        expect(frames.map((f) => countUpValue(value, f, duration))).toEqual(
          first,
        );
      }
    }
  });

  it("depends on the scene length", () => {
    expect(countUpValue(100, 20, 90)).not.toBe(countUpValue(100, 20, 150));
  });

  it("shows the value from the first frame with reduced motion, at any length", () => {
    for (const value of values) {
      for (const duration of durations) {
        for (const frame of [0, 1, countSettleFrame(duration) - 1]) {
          expect(countUpValue(value, frame, duration, true)).toBe(value);
        }
      }
    }
  });

  it("shows the value from the first frame below the minimum", () => {
    for (let duration = 1; duration < MIN; duration += 1) {
      for (const frame of frameRange(duration)) {
        expect(countUpValue(1234.5, frame, duration)).toBe(1234.5);
      }
    }
  });

  it("is a no-op scene style: the number moves, not the scene", () => {
    const tokens = themeTokens("modern");
    expect(countUp(0, 90, tokens)).toEqual({});
    expect(countUp(60, 90, tokens)).toEqual({});
  });
});

describe("count-up motion for the statistic", () => {
  it("draws the value itself with no count-up motion", () => {
    expect(countedValue(undefined, 42)).toBe(42);
  });

  it("draws the counted value under count-up motion", () => {
    const motion: CountMotion = {
      frame: 20,
      durationFrames: 90,
      reducedMotion: false,
    };
    expect(countedValue(motion, 42)).toBe(countUpValue(42, 20, 90));
    const still: CountMotion = { ...motion, reducedMotion: true };
    expect(countedValue(still, 42)).toBe(42);
  });
});
