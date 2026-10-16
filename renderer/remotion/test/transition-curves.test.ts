// The transitions (PRD §5.6; task 022, ADR-0005): what each boundary draws at its
// first, middle and last overlap frame, that cut never draws a blended frame,
// that the outgoing scene is gone by the overlap's last frame, and determinism.
import { describe, expect, it } from "vitest";
import {
  transitionStyle,
  transitionIds,
  type Overlap,
} from "../transitions/index.js";

const incoming = (name: string, overlapFrames = 10): Overlap => ({
  name,
  overlapFrames,
});
/** A 40-frame scene that fades in over 10 frames and out over 10. */
const DURATION = 40;
const IN = incoming("fade");
const OUT = incoming("fade");
const style = (frame: number, name = "fade") =>
  transitionStyle(frame, DURATION, incoming(name), incoming(name));

describe("incoming side", () => {
  it.each(transitionIds().filter((name) => name !== "cut"))(
    "%s: starts partly drawn and is complete on the overlap's last frame",
    (name) => {
      const first = transitionStyle(0, DURATION, incoming(name), undefined);
      const last = transitionStyle(9, DURATION, incoming(name), undefined);
      expect(first).toBeDefined();
      expect(last).toEqual(identityOf(name));
    },
  );

  it("fade rises with the overlap: half at the middle frame", () => {
    expect(transitionStyle(0, DURATION, IN)).toEqual({ opacity: 0.1 });
    expect(transitionStyle(4, DURATION, IN)).toEqual({ opacity: 0.5 });
    expect(transitionStyle(9, DURATION, IN)).toEqual({ opacity: 1 });
  });

  it("draws nothing after the overlap", () => {
    expect(transitionStyle(10, DURATION, IN)).toBeUndefined();
  });
});

describe("outgoing side", () => {
  it("draws nothing before the overlap starts", () => {
    expect(transitionStyle(29, DURATION, undefined, OUT)).toBeUndefined();
  });

  it.each(transitionIds().filter((name) => name !== "cut"))(
    "%s: is removed by the overlap's last frame",
    (name) => {
      expect(transitionStyle(39, DURATION, undefined, incoming(name))).toEqual(
        goneOf(name),
      );
    },
  );

  it("fade stays opaque beneath the incoming scene until the last frame", () => {
    expect(transitionStyle(30, DURATION, undefined, OUT)).toEqual({});
    expect(transitionStyle(38, DURATION, undefined, OUT)).toEqual({});
  });
});

describe("mid-overlap frames show both scenes", () => {
  it.each(["fade", "slide", "wipe", "zoom"])(
    "%s: the incoming and outgoing sides are both drawn at the middle frame",
    (name) => {
      const inside = transitionStyle(4, DURATION, incoming(name), undefined);
      const outside = transitionStyle(35, DURATION, undefined, incoming(name));
      expect(inside).toBeDefined();
      expect(outside).toBeDefined();
      expect(outside).not.toEqual(goneOf(name));
    },
  );
});

describe("cut", () => {
  it("never draws a blended frame: no style on any frame of either side", () => {
    for (let frame = 0; frame < DURATION; frame += 1) {
      expect(
        transitionStyle(frame, DURATION, undefined, undefined),
      ).toBeUndefined();
    }
  });

  it("draws no style for a zero-length overlap", () => {
    for (let frame = 0; frame < DURATION; frame += 1) {
      expect(
        transitionStyle(
          frame,
          DURATION,
          incoming("cut", 0),
          incoming("cut", 0),
        ),
      ).toBeUndefined();
    }
  });
});

describe("determinism and errors", () => {
  it("gives the same style for the same frame", () => {
    for (const name of transitionIds()) {
      expect(style(4, name)).toEqual(style(4, name));
    }
  });

  it("names every known transition in an unknown-name error", () => {
    expect(() => transitionStyle(0, DURATION, incoming("spin"))).toThrow(
      'unknown transition "spin" (known: cut, fade, slide, wipe, zoom)',
    );
  });
});

/** The incoming side's style on its last overlap frame: no change left. */
function identityOf(name: string) {
  return {
    fade: { opacity: 1 },
    slide: { transform: "translateX(0%)" },
    wipe: { clipPath: "inset(0 0% 0 0)" },
    zoom: { opacity: 1, transform: "scale(1)" },
  }[name];
}

/** The outgoing side's style on its last overlap frame: the scene is removed. */
function goneOf(name: string) {
  return {
    fade: { opacity: 0 },
    slide: { transform: "translateX(-100%)" },
    wipe: { clipPath: "inset(0 100% 0 0)" },
    zoom: { opacity: 0 },
  }[name];
}
