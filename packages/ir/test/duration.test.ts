// Durations → frames, driven by the shared vectors (ADR-0003). The Lua
// filter runs the same vectors (_extensions/video/tests/test_duration_vectors.lua).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { durationToFrames } from "../src/index.js";

interface Vector {
  input: string;
  fps: number;
  frames?: number;
  errorCode?: string;
}

const VECTORS: Vector[] = JSON.parse(
  readFileSync(
    new URL("../test-vectors/durations.json", import.meta.url),
    "utf8",
  ),
);

describe("durationToFrames", () => {
  it("has at least 20 shared vectors", () => {
    expect(VECTORS.length).toBeGreaterThanOrEqual(20);
  });

  for (const vector of VECTORS) {
    const label = `"${vector.input}" at ${vector.fps} fps`;
    if (vector.errorCode !== undefined) {
      it(`${label} is rejected with ${vector.errorCode}`, () => {
        const result = durationToFrames(vector.input, vector.fps);
        expect(result).toMatchObject({ ok: false, code: vector.errorCode });
      });
    } else {
      it(`${label} is ${vector.frames} frames`, () => {
        expect(durationToFrames(vector.input, vector.fps)).toEqual({
          ok: true,
          frames: vector.frames,
        });
      });
    }
  }

  it("names the value in the message of a rejected duration", () => {
    const result = durationToFrames("-1s", 30);
    expect(result).toEqual({
      ok: false,
      code: "E_DURATION_RANGE",
      message: 'duration "-1s" must be greater than zero',
    });
  });
});
