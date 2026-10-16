// Source audio of a kept `.video` block (task 044; ADR-0009): the passes that
// follow the picture (trim, loop, freeze, end of scene, unknown end) and the gain
// over transition overlaps. Pure: no browser, no Remotion.
import type { IrMediaVideo } from "@quarto-video/ir";
import { describe, expect, it } from "vitest";
import { audioSegmentsOf, gainAt } from "../media/audio.js";

function clip(overrides: Partial<IrMediaVideo> = {}): IrMediaVideo {
  return {
    type: "video",
    src: "assets/clip.mp4",
    placement: "background",
    fit: "contain",
    sourceStartFrames: 0,
    sourceEndFrames: 30,
    audio: "keep",
    volume: 1,
    loop: false,
    freeze: false,
    playbackRate: 1,
    alt: "",
    ...overrides,
  };
}

describe("kept audio passes", () => {
  it("plays the source range once from its in-point, trimmed to the scene", () => {
    const pass = audioSegmentsOf(
      clip({ sourceStartFrames: 12, sourceEndFrames: 42 }),
      30,
    );
    expect(pass).toEqual([{ from: 0, frames: 30, trimBefore: 12 }]);
  });

  it("never runs past the scene: a range longer than the scene is cut at its end", () => {
    const pass = audioSegmentsOf(clip({ sourceEndFrames: 90 }), 30);
    expect(pass).toEqual([{ from: 0, frames: 30, trimBefore: 0 }]);
  });

  it("loops the range in step with the picture, the last pass cut to the scene", () => {
    const passes = audioSegmentsOf(
      clip({ loop: true, sourceStartFrames: 6, sourceEndFrames: 36 }),
      75,
    );
    expect(passes).toEqual([
      { from: 0, frames: 30, trimBefore: 6 },
      { from: 30, frames: 30, trimBefore: 6 },
      { from: 60, frames: 15, trimBefore: 6 },
    ]);
  });

  it("freezes into silence: the range plays once and nothing follows it", () => {
    const passes = audioSegmentsOf(clip({ freeze: true }), 75);
    expect(passes).toEqual([{ from: 0, frames: 30, trimBefore: 0 }]);
  });

  it("with no source end, plays to the scene's end from the in-point", () => {
    const open = clip();
    delete open.sourceEndFrames;
    expect(audioSegmentsOf(open, 40)).toEqual([
      { from: 0, frames: 40, trimBefore: 0 },
    ]);
  });

  it("refuses a rate other than 1, since the sound would not match the picture", () => {
    expect(() => audioSegmentsOf(clip({ playbackRate: 2 }), 30)).toThrow(
      /playbackRate 1/,
    );
  });
});

describe("kept audio gain", () => {
  const plain = { durationFrames: 10, incoming: 0, outgoing: 0 };

  it("is the volume outside any overlap", () => {
    expect(gainAt(0, 0.5, plain)).toBe(0.5);
    expect(gainAt(9, 0.5, plain)).toBe(0.5);
  });

  it("rises over the incoming overlap, reaching the volume on its last frame", () => {
    const ramp = { durationFrames: 10, incoming: 4, outgoing: 0 };
    expect([0, 1, 2, 3, 4].map((f) => gainAt(f, 1, ramp))).toEqual([
      0.25, 0.5, 0.75, 1, 1,
    ]);
  });

  it("falls over the outgoing overlap, silent on the scene's last frame", () => {
    const ramp = { durationFrames: 10, incoming: 0, outgoing: 4 };
    expect([5, 6, 7, 8, 9].map((f) => gainAt(f, 1, ramp))).toEqual([
      1, 0.75, 0.5, 0.25, 0,
    ]);
  });

  it("scales the ramp by the volume", () => {
    const ramp = { durationFrames: 10, incoming: 4, outgoing: 0 };
    expect(gainAt(1, 0.5, ramp)).toBe(0.25);
  });
});
