// Stage 6 (packages/validator/src/stages/output.ts): each rule of the output
// check, with IR and facts built in the test (no tool runs here).
import { describe, expect, it } from "vitest";
import type { IrVideo } from "@quarto-video/ir";
import { checkOutput, type OutputFacts } from "../src/index.js";

const IR = {
  schemaVersion: "1.0",
  type: "video",
  settings: { width: 640, height: 360, fps: 30, background: "#000000" },
  scenes: [],
  timeline: { durationFrames: 30, scenes: [] },
} as unknown as IrVideo;

const GOOD: OutputFacts = {
  file: "output.mp4",
  exists: true,
  bytes: 1234,
  video: { width: 640, height: 360, fps: 30, frames: 30 },
};

describe("output check (stage 6)", () => {
  it("accepts an output whose size, rate and frames match the IR", () => {
    expect(checkOutput(IR, GOOD)).toEqual([]);
  });

  it("reports a missing output as E_OUTPUT_MISSING", () => {
    const found = checkOutput(IR, {
      ...GOOD,
      exists: false,
      bytes: 0,
      video: null,
    });
    expect(found.map((d) => d.code)).toEqual(["E_OUTPUT_MISSING"]);
    expect(found[0]?.file).toBe("output.mp4");
  });

  it("reports an empty output as E_OUTPUT_MISSING", () => {
    const found = checkOutput(IR, { ...GOOD, bytes: 0 });
    expect(found.map((d) => d.code)).toEqual(["E_OUTPUT_MISSING"]);
  });

  it("reports a file with no readable video as E_OUTPUT_UNREADABLE", () => {
    const found = checkOutput(IR, { ...GOOD, video: null });
    expect(found.map((d) => d.code)).toEqual(["E_OUTPUT_UNREADABLE"]);
  });

  it("reports a wrong frame count as E_OUTPUT_MISMATCH naming the property", () => {
    const found = checkOutput(IR, {
      ...GOOD,
      video: { ...GOOD.video!, frames: 29 },
    });
    expect(found).toEqual([
      {
        severity: "error",
        code: "E_OUTPUT_MISMATCH",
        file: "output.mp4",
        property: "frames",
        message: "frames: output.mp4 has 29, the IR expects 30.",
        suggestion:
          "The file is not the video the IR describes; it is not written to video.output.",
      },
    ]);
  });

  it("reports width, height and fps mismatches one by one", () => {
    const found = checkOutput(IR, {
      ...GOOD,
      video: { width: 1280, height: 360, fps: 29.97, frames: 30 },
    });
    expect(found.map((d) => d.property)).toEqual(["width", "fps"]);
    expect(found.every((d) => d.code === "E_OUTPUT_MISMATCH")).toBe(true);
  });

  it("uses the IR timeline length for frames", () => {
    const withTimeline = {
      ...IR,
      timeline: { durationFrames: 45, scenes: [] },
    } as unknown as IrVideo;
    const found = checkOutput(withTimeline, GOOD);
    expect(found.map((d) => d.message)).toEqual([
      "frames: output.mp4 has 30, the IR expects 45.",
    ]);
  });
});
