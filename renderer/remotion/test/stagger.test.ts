// The stagger preset's item schedule (PRD §5.6, §12; task 028): deterministic,
// the last item in place by 70% of the scene for 2 to 6 items, items on screen
// in document order, static when reduced or short, and a schedule that depends
// on both the item count and the scene length.
import { describe, expect, it } from "vitest";
import { getAnimation } from "@quarto-video/registry";
import { animationStyle } from "../animations/index.js";
import {
  STAGGER_ENTER_FRAMES,
  stagger,
  staggerItemStyle,
  staggerSchedule,
  staggerSettleFrame,
} from "../animations/stagger.js";
import { themeTokens } from "../themes/tokens.js";

const tokens = themeTokens("modern");
const MIN = getAnimation("stagger").minFrames;
/** Scene lengths from the minimum up to two minutes at 30 fps. */
const durations = [45, 46, 60, 74, 90, 91, 150, 299, 1800];
/** Item counts from one item up to the bullets limit of six, and past it. */
const counts = [1, 2, 3, 4, 5, 6, 7, 12];

describe("stagger schedule", () => {
  it("settles every item by 70% of the scene, at ceil(0.7 * duration)", () => {
    expect(staggerSettleFrame(90)).toBe(63);
    expect(staggerSettleFrame(91)).toBe(64);
  });

  it("starts the first item at frame 0 and never runs an item past the settle frame", () => {
    for (const duration of durations) {
      for (const count of counts) {
        const slots = staggerSchedule(count, duration);
        expect(slots).toHaveLength(count);
        expect(slots[0]?.start).toBe(0);
        for (const slot of slots) {
          expect(slot.end).toBeLessThanOrEqual(staggerSettleFrame(duration));
        }
      }
    }
  });

  it("starts the items in document order, one after another", () => {
    for (const duration of durations) {
      for (const count of counts) {
        const starts = staggerSchedule(count, duration).map((s) => s.start);
        expect(starts).toEqual([...starts].sort((a, b) => a - b));
      }
    }
  });

  it("depends on the item count and the scene length", () => {
    const starts = (count: number, duration: number) =>
      staggerSchedule(count, duration).map((s) => s.start);
    expect(starts(4, 90)).not.toEqual(starts(4, 150));
    expect(starts(3, 90)).not.toEqual(starts(6, 90));
  });

  it("is the same for the same inputs, in any order of calls", () => {
    const first = staggerSchedule(5, 150);
    staggerSchedule(2, 60);
    expect(staggerSchedule(5, 150)).toEqual(first);
  });
});

describe("stagger item style", () => {
  it("the last item is fully visible by 70% of the scene, for 2 to 6 items", () => {
    for (const duration of durations) {
      for (let count = 2; count <= 6; count += 1) {
        for (
          let frame = staggerSettleFrame(duration);
          frame < duration;
          frame += 1
        ) {
          for (let item = 0; item < count; item += 1) {
            expect(
              staggerItemStyle(item, count, frame, duration, tokens),
            ).toEqual({ opacity: 1, transform: "translateY(0px)" });
          }
        }
      }
    }
  });

  it("is deterministic: the same frame gives the same style, every time", () => {
    for (let frame = 0; frame < 150; frame += 1) {
      const a = staggerItemStyle(2, 5, frame, 150, tokens);
      const b = staggerItemStyle(2, 5, frame, 150, tokens);
      expect(a).toEqual(b);
    }
  });

  it("items on screen appear in document order at every frame", () => {
    for (const duration of durations) {
      for (let count = 2; count <= 6; count += 1) {
        for (let frame = 0; frame < duration; frame += 1) {
          const opacities = Array.from(
            { length: count },
            (_, item) =>
              staggerItemStyle(item, count, frame, duration, tokens).opacity ??
              NaN,
          );
          // An earlier item is never less visible than a later one.
          for (let i = 1; i < count; i += 1) {
            expect(opacities[i - 1]).toBeGreaterThanOrEqual(
              opacities[i] ?? NaN,
            );
          }
        }
      }
    }
  });

  it("an item is hidden before its start, rises and fades in, and is whole at its end", () => {
    const [, second] = staggerSchedule(3, 150);
    const start = second?.start ?? -1;
    expect(staggerItemStyle(1, 3, start, 150, tokens)).toEqual({
      opacity: 0,
      transform: `translateY(${tokens.space.sm}px)`,
    });
    const mid = staggerItemStyle(1, 3, start + 3, 150, tokens);
    expect(mid.opacity).toBeGreaterThan(0);
    expect(mid.opacity).toBeLessThan(1);
    expect(
      staggerItemStyle(1, 3, start + STAGGER_ENTER_FRAMES, 150, tokens),
    ).toEqual({ opacity: 1, transform: "translateY(0px)" });
  });

  it("draws every item in place from the first frame with reduced motion", () => {
    for (let frame = 0; frame < 150; frame += 1) {
      expect(staggerItemStyle(4, 6, frame, 150, tokens, true)).toEqual({
        opacity: 1,
        transform: "translateY(0px)",
      });
    }
  });

  it("draws every item in place from the first frame below the minimum", () => {
    for (let frame = 0; frame < MIN - 1; frame += 1) {
      expect(staggerItemStyle(0, 3, frame, MIN - 1, tokens)).toEqual({
        opacity: 1,
        transform: "translateY(0px)",
      });
    }
  });

  it("rejects an item index outside the list", () => {
    expect(() => staggerItemStyle(3, 3, 0, 90, tokens)).toThrow(RangeError);
  });

  it("moves the items, not the scene", () => {
    expect(stagger(0, 90, tokens)).toEqual({});
    expect(animationStyle("stagger", 10, 90, tokens)).toEqual({});
  });
});
