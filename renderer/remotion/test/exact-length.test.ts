// The stitched output is cut to the timeline's frames (task 045; ADR-0017): the
// `-t` option goes before the output file, and the other arguments are unchanged.
import { describe, expect, it } from "vitest";
import { cutToFrames } from "../src/exact-length.js";

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
