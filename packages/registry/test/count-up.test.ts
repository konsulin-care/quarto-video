// The count-up preset's contract (PRD §5.6; task 032): it applies to statistic
// only, it is static when short or with reduced motion, and no other component
// lists it.
import { describe, expect, it } from "vitest";
import { getAnimation, getComponent, listComponents } from "../src/index.js";

describe("count-up preset contract", () => {
  it("applies to statistic, and to no other component", () => {
    expect(getAnimation("count-up").compatibleComponents).toEqual([
      "statistic",
    ]);
    const listing = listComponents()
      .filter((c) => c.compatibleAnimations.includes("count-up"))
      .map((c) => c.id);
    expect(listing).toEqual(["statistic"]);
  });

  it("is not compatible with title, bullets or statement", () => {
    for (const id of ["title", "bullets", "statement"]) {
      expect(getComponent(id).compatibleAnimations).not.toContain("count-up");
    }
  });

  it("has a 45-frame minimum (1.5 s at 30 fps) and a static short-scene and reduced-motion rule", () => {
    const preset = getAnimation("count-up");
    expect(preset.minFrames).toBe(45);
    expect(preset.shortScene).toBe("static");
    expect(preset.reducedMotion).toBe("static");
  });
});
