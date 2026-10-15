// The kinetic word rule (task 026): what counts as a word, and when a statement
// falls back to fade-in. The validator and the renderer both use these functions.
import { describe, expect, it } from "vitest";
import { getAnimation } from "../src/index.js";
import {
  KINETIC_MAX_WORDS,
  countWords,
  kineticFallsBack,
} from "../src/kinetic.js";

describe("kinetic word rule", () => {
  it("counts runs of non-space characters, across spaces, tabs and line breaks", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
    expect(countWords("one")).toBe(1);
    expect(countWords("Small  steps\tcompound\n\nevery day.")).toBe(5);
    expect(countWords('"Quoted words" count.')).toBe(3);
  });

  it("allows up to the maximum and falls back past it", () => {
    const text = (n: number) =>
      Array.from({ length: n }, () => "word").join(" ");
    expect(kineticFallsBack(text(KINETIC_MAX_WORDS))).toBe(false);
    expect(kineticFallsBack(text(KINETIC_MAX_WORDS + 1))).toBe(true);
    expect(kineticFallsBack(text(40))).toBe(true);
  });

  it("is registered for statement only", () => {
    const preset = getAnimation("kinetic");
    expect(preset.compatibleComponents).toEqual(["statement"]);
    expect(preset.minFrames).toBe(30);
    expect(preset.shortScene).toBe("static");
    expect(preset.reducedMotion).toBe("static");
  });
});
