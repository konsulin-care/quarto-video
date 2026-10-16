// The project music track (task 045; ADR-0017): the passes over the timeline
// and the gain by frame, pure: no browser, no Remotion. A 45-frame file, a
// 150-frame timeline and a 30-frame fade-out are the common case.
import type { IrMusic } from "@quarto-video/ir";
import { describe, expect, it } from "vitest";
import { musicGainAt, musicPassesOf } from "../media/music.js";

function track(overrides: Partial<IrMusic> = {}): IrMusic {
  return {
    src: "assets/music.wav",
    volume: 1,
    loop: false,
    lengthFrames: 45,
    ...overrides,
  };
}

describe("music passes", () => {
  it("plays a file longer than the timeline once, cut at the timeline's end", () => {
    expect(musicPassesOf(track({ lengthFrames: 270 }), 150)).toEqual([
      { from: 0, frames: 150 },
    ]);
  });

  it("plays a file exactly as long as the timeline once", () => {
    expect(musicPassesOf(track({ lengthFrames: 150 }), 150)).toEqual([
      { from: 0, frames: 150 },
    ]);
  });

  it("repeats a looped file back to back, the last pass cut at the end", () => {
    expect(musicPassesOf(track({ loop: true }), 150)).toEqual([
      { from: 0, frames: 45 },
      { from: 45, frames: 45 },
      { from: 90, frames: 45 },
      { from: 135, frames: 15 },
    ]);
  });

  it("starts a looped file's last pass on a frame edge inside the timeline", () => {
    expect(musicPassesOf(track({ loop: true }), 100)).toEqual([
      { from: 0, frames: 45 },
      { from: 45, frames: 45 },
      { from: 90, frames: 10 },
    ]);
  });

  it("refuses a track with no length: the validator writes it", () => {
    const unresolved = track();
    delete unresolved.lengthFrames;
    expect(() => musicPassesOf(unresolved, 150)).toThrow(/lengthFrames/);
  });
});

describe("music gain", () => {
  it("is the volume for every frame when there is no fade-out", () => {
    const quiet = track({ volume: 0.5 });
    for (const frame of [0, 1, 74, 149]) {
      expect(musicGainAt(frame, quiet, 150)).toBe(0.5);
    }
  });

  it("falls linearly over the last N frames and is silent on the last frame", () => {
    const faded = track({ fadeOutFrames: 30 });
    expect(musicGainAt(119, faded, 150)).toBe(1);
    expect(musicGainAt(120, faded, 150)).toBeCloseTo(29 / 30, 12);
    expect(musicGainAt(134, faded, 150)).toBeCloseTo(15 / 30, 12);
    expect(musicGainAt(149, faded, 150)).toBe(0);
  });

  it("decreases strictly over the fade-out window", () => {
    const faded = track({ fadeOutFrames: 30, volume: 0.8 });
    const gains = Array.from({ length: 30 }, (_, k) =>
      musicGainAt(120 + k, faded, 150),
    );
    for (let k = 1; k < gains.length; k++) {
      expect(gains[k]).toBeLessThan(gains[k - 1] as number);
    }
  });

  it("scales the fade by the volume", () => {
    const faded = track({ volume: 0.5, fadeOutFrames: 30 });
    expect(musicGainAt(120, faded, 150)).toBeCloseTo(0.5 * (29 / 30), 12);
  });
});
