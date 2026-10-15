// Parity between the transition registry and the renderer (task 022): every
// registry transition has a frame function and every frame function has one.
import { describe, expect, it } from "vitest";
import { listTransitionPresets } from "@quarto-video/registry";
import { TRANSITIONS, transitionIds } from "../transitions/index.js";

describe("registry and renderer transition parity", () => {
  it("maps exactly the transition names the registry declares", () => {
    const registryIds = listTransitionPresets().map((p) => p.id);
    expect(transitionIds()).toEqual([...registryIds].sort());
    expect(Object.keys(TRANSITIONS).sort()).toEqual(transitionIds());
  });

  it("maps every name to an incoming and an outgoing side", () => {
    for (const preset of Object.values(TRANSITIONS)) {
      expect(typeof preset.incoming).toBe("function");
      expect(typeof preset.outgoing).toBe("function");
    }
  });
});
