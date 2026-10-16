// Parity between the animation registry and the renderer (task 021): every
// registry preset has a frame function and every frame function has a preset.
import { describe, expect, it } from "vitest";
import { listAnimations } from "@quarto-video/registry";
import { ANIMATIONS } from "../animations/index.js";

describe("registry and renderer animation parity", () => {
  it("maps exactly the preset ids the registry declares", () => {
    const registryIds = listAnimations().map((p) => p.id);
    expect(Object.keys(ANIMATIONS).sort()).toEqual([...registryIds].sort());
  });

  it("maps every id to a frame function", () => {
    for (const preset of Object.values(ANIMATIONS)) {
      expect(typeof preset).toBe("function");
    }
  });
});
