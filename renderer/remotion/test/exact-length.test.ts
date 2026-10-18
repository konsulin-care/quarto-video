// The stitched output is cut to the timeline's frames (task 045; ADR-0017): the
// `-t` option goes before the output file, and the other arguments are unchanged.
import { describe, expect, it } from "vitest";
import {
  ENCODER_DELAY_SECONDS,
  alignAudio,
  cutToFrames,
} from "../src/exact-length.js";

describe("output length", () => {
  it("cuts the stitch to the timeline's length, before the output file", () => {
    expect(
      cutToFrames(["-c:v", "libx264", "-c:a", "aac", "out.mp4"], 150, 30),
    ).toEqual(["-c:v", "libx264", "-c:a", "aac", "-t", "5.000000", "out.mp4"]);
  });

  it("writes a fractional length exactly to six decimals (frames at fps)", () => {
    expect(cutToFrames(["out.mp4"], 45, 30)).toEqual([
      "-t",
      "1.500000",
      "out.mp4",
    ]);
    expect(cutToFrames(["out.mp4"], 1, 30)).toEqual([
      "-t",
      "0.033333",
      "out.mp4",
    ]);
  });

  it("leaves an empty argument list as it is", () => {
    expect(cutToFrames([], 150, 30)).toEqual([]);
  });
});

describe("audio alignment", () => {
  const stitch = [
    "-i",
    "video.mp4",
    "-i",
    "audio.aac",
    "-c:a",
    "copy",
    "out.mp4",
  ];

  it("moves the pre-encoded audio input earlier by the encoder delay, before its -i", () => {
    expect(alignAudio(stitch)).toEqual([
      "-i",
      "video.mp4",
      "-itsoffset",
      (-2048 / 48000).toFixed(9),
      "-i",
      "audio.aac",
      "-c:a",
      "copy",
      "out.mp4",
    ]);
  });

  it("uses a lead given by the caller", () => {
    expect(alignAudio(stitch, 0.5)).toContain("-0.500000000");
  });

  it("leaves arguments without a copied audio input unchanged", () => {
    const silent = ["-i", "video.mp4", "-an", "out.mp4"];
    expect(alignAudio(silent)).toEqual(silent);
  });

  it("matches the measured lead: 1882 samples at 44.1 kHz, which is 2048 at 48 kHz", () => {
    expect(Math.abs(ENCODER_DELAY_SECONDS * 44100 - 1882)).toBeLessThan(1);
  });
});
