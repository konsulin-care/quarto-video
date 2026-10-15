// The stagger preset's contract (PRD §5.6; task 028): it applies to the list
// components only (bullets and end-card credits), it is static when short or
// with reduced motion, and no other component lists it.
import { describe, expect, it } from "vitest";
import { getAnimation, getComponent, listComponents } from "../src/index.js";

describe("stagger preset contract", () => {
  it("applies to bullets and end-card, and to no other component", () => {
    expect(getAnimation("stagger").compatibleComponents).toEqual([
      "bullets",
      "end-card",
    ]);
    const listing = listComponents()
      .filter((c) => c.compatibleAnimations.includes("stagger"))
      .map((c) => c.id);
    expect(listing).toEqual(["bullets", "end-card"]);
  });

  it("is not compatible with statistic, statement or title", () => {
    for (const id of ["statistic", "statement", "title"]) {
      expect(getComponent(id).compatibleAnimations).not.toContain("stagger");
    }
  });

  it("has a 45-frame minimum (1.5 s at 30 fps) and a static short-scene and reduced-motion rule", () => {
    const preset = getAnimation("stagger");
    expect(preset.minFrames).toBe(45);
    expect(preset.shortScene).toBe("static");
    expect(preset.reducedMotion).toBe("static");
  });
});
