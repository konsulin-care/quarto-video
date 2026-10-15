// The kinetic preset's word schedule (PRD §5.6, §12; task 026): deterministic,
// every word in place from 80% of the scene, static when reduced or short, the
// fallback to fade-in past the word limit, and word splits that match the count.
import { describe, expect, it } from "vitest";
import { countWords, KINETIC_MAX_WORDS } from "@quarto-video/registry/kinetic";
import { effectiveAnimation } from "../animations/index.js";
import {
  kinetic,
  kineticSchedule,
  kineticWordStyle,
  settleFrame,
} from "../animations/kinetic.js";
import { splitWords, newWordState } from "../components/statement/words.js";
import { themeTokens } from "../themes/tokens.js";

const tokens = themeTokens("modern");

/** Scene lengths from the minimum (30 frames) up to two minutes at 30 fps. */
const durations = [30, 31, 45, 59, 60, 90, 91, 150, 299, 1800];
/** Word counts from one word up to the limit and past it. */
const counts = [1, 2, 3, 5, 7, 8, 11, 12, 13, 40];

describe("kinetic schedule", () => {
  it("settles every word by 80% of the scene, at ceil(0.8 * duration)", () => {
    expect(settleFrame(90)).toBe(72);
    expect(settleFrame(91)).toBe(73);
  });

  it("starts the first word at frame 0 and never runs a word past the settle frame", () => {
    for (const duration of durations) {
      for (const count of counts) {
        const slots = kineticSchedule(count, duration);
        expect(slots).toHaveLength(count);
        expect(slots[0]?.start).toBe(0);
        for (const slot of slots) {
          expect(slot.end).toBeLessThanOrEqual(settleFrame(duration));
        }
      }
    }
  });

  it("starts the words in order, one after another", () => {
    for (const duration of durations) {
      for (const count of counts) {
        const starts = kineticSchedule(count, duration).map((s) => s.start);
        expect(starts).toEqual([...starts].sort((a, b) => a - b));
      }
    }
  });

  it("is the same for the same inputs, in any order of calls", () => {
    const first = kineticSchedule(7, 150);
    kineticSchedule(3, 60);
    expect(kineticSchedule(7, 150)).toEqual(first);
  });
});

describe("kinetic word style", () => {
  it("every word is fully visible from 80% of the scene onward", () => {
    for (const duration of durations) {
      for (const count of counts) {
        for (let frame = settleFrame(duration); frame < duration; frame += 1) {
          for (let word = 0; word < count; word += 1) {
            expect(
              kineticWordStyle(word, count, frame, duration, tokens),
            ).toEqual({ opacity: 1, transform: "translateY(0px)" });
          }
        }
      }
    }
  });

  it("is deterministic: the same frame gives the same style, every time", () => {
    for (let frame = 0; frame < 150; frame += 1) {
      const a = kineticWordStyle(2, 8, frame, 150, tokens);
      const b = kineticWordStyle(2, 8, frame, 150, tokens);
      expect(a).toEqual(b);
    }
  });

  it("a word is hidden before its start, rises and fades in, and is whole at its end", () => {
    const [, second] = kineticSchedule(4, 150);
    const start = second?.start ?? -1;
    expect(kineticWordStyle(1, 4, start, 150, tokens)).toEqual({
      opacity: 0,
      transform: `translateY(${tokens.space.sm}px)`,
    });
    const mid = kineticWordStyle(1, 4, start + 3, 150, tokens);
    expect(mid.opacity).toBeGreaterThan(0);
    expect(mid.opacity).toBeLessThan(1);
    expect(kineticWordStyle(1, 4, start + 6, 150, tokens)).toEqual({
      opacity: 1,
      transform: "translateY(0px)",
    });
  });

  it("draws every word in place from the first frame with reduced motion", () => {
    for (let frame = 0; frame < 150; frame += 1) {
      expect(kineticWordStyle(5, 8, frame, 150, tokens, true)).toEqual({
        opacity: 1,
        transform: "translateY(0px)",
      });
    }
  });

  it("draws every word in place from the first frame below its minimum", () => {
    for (let frame = 0; frame < 29; frame += 1) {
      expect(kineticWordStyle(0, 3, frame, 29, tokens)).toEqual({
        opacity: 1,
        transform: "translateY(0px)",
      });
    }
  });

  it("rejects a word index outside the statement", () => {
    expect(() => kineticWordStyle(3, 3, 0, 90, tokens)).toThrow(RangeError);
  });

  it("moves the words, not the scene", () => {
    expect(kinetic(0, 90, tokens)).toEqual({});
    expect(kinetic(89, 90, tokens)).toEqual({});
  });
});

describe("kinetic fallback", () => {
  const text = (n: number) => Array.from({ length: n }, () => "word").join(" ");

  it("draws a statement up to the word limit word by word", () => {
    expect(effectiveAnimation("kinetic", text(KINETIC_MAX_WORDS))).toBe(
      "kinetic",
    );
  });

  it("draws a 40-word statement with fade-in", () => {
    expect(effectiveAnimation("kinetic", text(40))).toBe("fade-in");
  });

  it("leaves every other preset and an unset animation as they are", () => {
    expect(effectiveAnimation("reveal", text(40))).toBe("reveal");
    expect(effectiveAnimation(undefined, text(40))).toBeUndefined();
  });
});

describe("statement word split", () => {
  it("counts the same words as the registry, across emphasis and line breaks", () => {
    const samples = [
      "One two three.",
      "  spaced   out\tand\nlines  ",
      '"Quoted" text, with "marks".',
      "Emphasis**inside**a word, plus `code here`.",
    ];
    for (const sample of samples) {
      const state = newWordState();
      splitWords(sample, state);
      expect(state.last + 1, sample).toBe(countWords(sample));
    }
  });

  it("keeps one index for a word split across pieces", () => {
    const state = newWordState();
    const pieces = [
      ...splitWords("Emph", state),
      ...splitWords("asis", state),
      ...splitWords(" next", state),
    ];
    expect(pieces.map((p) => p.word)).toEqual([0, 0, undefined, 1]);
  });
});
