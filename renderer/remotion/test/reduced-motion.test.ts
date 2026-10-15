// Reduced motion (PRD §12; task 023): with the IR's setting on, each animation
// draws its registry rule ("static": the end state from the first frame) and
// each transition draws its registry fallback ("fade" or "cut"), over the same
// overlap. Pure: no browser; the pixels are checked by the visual cases.
import { describe, expect, it } from "vitest";
import { animationIds, animationStyle } from "../animations/index.js";
import { transitionStyle, type Overlap } from "../transitions/index.js";
import { themeTokens } from "../themes/tokens.js";

const tokens = themeTokens("modern");
const DURATION = 45;

/** The end state each animation draws with reduced motion, by id. */
const END_STATE: Record<string, object> = {
  "fade-in": { opacity: 1 },
  kinetic: {},
  "slide-up": { opacity: 1, transform: "translateY(0px)" },
  reveal: { opacity: 1, transform: "scale(1)" },
};

describe("reduced motion: animations", () => {
  it.each(animationIds())(
    "%s is static: the same end state at every frame",
    (name) => {
      const frames = [0, 1, 7, 14, 30, DURATION - 1];
      const styles = frames.map((frame) =>
        animationStyle(name, frame, DURATION, tokens, true),
      );
      for (const style of styles) expect(style).toEqual(styles[0]);
      expect(styles[0]).toEqual(END_STATE[name]);
    },
  );

  // kinetic moves its words, not the scene: kinetic.test.ts checks its motion.
  it.each(animationIds().filter((name) => name !== "kinetic"))(
    "%s without reduced motion still moves",
    (name) => {
      const start = animationStyle(name, 0, DURATION, tokens, false);
      const end = animationStyle(name, DURATION - 1, DURATION, tokens, false);
      expect(start).not.toEqual(end);
    },
  );

  it("every animation id has an end state in this test", () => {
    expect(Object.keys(END_STATE).sort()).toEqual(animationIds());
  });
});

describe("reduced motion: transitions", () => {
  const overlap = (name: string, overlapFrames = 15): Overlap => ({
    name,
    overlapFrames,
  });

  it.each(["slide", "wipe", "zoom"])(
    "%s draws the fade fallback over the same overlap, frame by frame",
    (name) => {
      const incoming = overlap(name);
      const outgoing = overlap(name);
      const fade = (frame: number) =>
        transitionStyle(frame, DURATION, overlap("fade"), overlap("fade"));
      for (let frame = 0; frame < DURATION; frame += 1) {
        expect(
          transitionStyle(frame, DURATION, incoming, outgoing, true),
        ).toEqual(fade(frame));
      }
    },
  );

  it("fade and cut keep their own style with reduced motion", () => {
    for (const name of ["fade", "cut"]) {
      for (const frame of [0, 7, 14, 30, DURATION - 1]) {
        expect(
          transitionStyle(frame, DURATION, overlap(name), overlap(name), true),
        ).toEqual(
          transitionStyle(frame, DURATION, overlap(name), overlap(name)),
        );
      }
    }
  });

  it("a fallback keeps the overlap: the outgoing scene ends on the overlap's last frame", () => {
    // Slide's fallback is fade: on the last overlap frame the outgoing scene is removed.
    const outgoing = overlap("slide", 10);
    expect(
      transitionStyle(DURATION - 10, DURATION, undefined, outgoing, true),
    ).toEqual({});
    expect(
      transitionStyle(DURATION - 1, DURATION, undefined, outgoing, true),
    ).toEqual({ opacity: 0 });
  });
});
