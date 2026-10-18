// The source frame of a background clip at each scene frame (task 039; PRD §6.2):
// trim at playbackRate, loop and freeze. Pure: no browser, no files.
import { describe, expect, it } from "vitest";
import type { IrMediaVideo } from "@quarto-video/ir";
import { planOf, sourceFrameAt, type SourcePlan } from "../media/schedule.js";

function plan(overrides: Partial<SourcePlan>): SourcePlan {
  return {
    start: 0,
    end: Number.POSITIVE_INFINITY,
    rate: 1,
    loop: false,
    freeze: false,
    ...overrides,
  };
}

function media(overrides: Partial<IrMediaVideo>): IrMediaVideo {
  return {
    type: "video",
    src: "assets/clip.mp4",
    placement: "background",
    fit: "contain",
    sourceStartFrames: 0,
    audio: "mute",
    loop: false,
    freeze: false,
    playbackRate: 1,
    alt: "",
    ...overrides,
  };
}

describe("background footage schedule", () => {
  it("trims: scene frame N shows source start + N x rate", () => {
    const trim = plan({ start: 30, end: 120, rate: 2 });
    expect(sourceFrameAt(0, trim)).toBe(30);
    expect(sourceFrameAt(1, trim)).toBe(32);
    expect(sourceFrameAt(44, trim)).toBe(118);
  });

  it("slows a fractional rate by whole source frames, never stretching", () => {
    const slow = plan({ start: 10, rate: 0.5 });
    expect(sourceFrameAt(3, slow)).toBe(11);
    expect(sourceFrameAt(4, slow)).toBe(12);
  });

  it("loops the source range at normal speed", () => {
    const loop = plan({ start: 30, end: 60, loop: true });
    expect(sourceFrameAt(0, loop)).toBe(30);
    expect(sourceFrameAt(29, loop)).toBe(59);
    expect(sourceFrameAt(30, loop)).toBe(30);
    expect(sourceFrameAt(75, loop)).toBe(45);
  });

  it("freezes on the last frame of the range once the footage has run out", () => {
    const freeze = plan({ start: 60, end: 90, freeze: true });
    expect(sourceFrameAt(0, freeze)).toBe(60);
    expect(sourceFrameAt(29, freeze)).toBe(89);
    expect(sourceFrameAt(30, freeze)).toBe(89);
    expect(sourceFrameAt(500, freeze)).toBe(89);
  });

  it("plays to the end of an unknown source when no end is given", () => {
    expect(sourceFrameAt(5, plan({ start: 10 }))).toBe(15);
  });

  it("reads the plan from the IR block", () => {
    expect(
      planOf(
        media({ sourceStartFrames: 30, sourceEndFrames: 120, playbackRate: 2 }),
      ),
    ).toEqual({ start: 30, end: 120, rate: 2, loop: false, freeze: false });
  });

  it("refuses to loop or freeze an unresolved source end", () => {
    expect(() => planOf(media({ loop: true }))).toThrow(
      /has no resolved source end/,
    );
    expect(() => planOf(media({ freeze: true }))).toThrow(
      /has no resolved source end/,
    );
  });
});
