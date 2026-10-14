// The frame-rate parser behind the stage 6 probe (packages/cli/src/output-probe.ts).
import { describe, expect, it } from "vitest";
import { parseRate } from "../src/output-probe.js";

describe("frame rate from ffprobe", () => {
  it("reads an integer rate and a fractional one", () => {
    expect(parseRate("30/1")).toBe(30);
    expect(parseRate("30000/1001")).toBeCloseTo(29.97, 2);
  });

  it("rejects a zero denominator and text that is not a rate", () => {
    expect(parseRate("30/0")).toBeNull();
    expect(parseRate("thirty")).toBeNull();
    expect(parseRate("")).toBeNull();
  });
});
