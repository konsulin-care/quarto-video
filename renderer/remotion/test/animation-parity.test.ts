// Parity between the animation registry and the renderer (task 021, ADR-0020):
// every registry preset has a frame function and every frame function has a
// preset. Entrance presets are drawn from ANIMATIONS, exit presets from EXITS.
import { describe, expect, it } from "vitest";
import { listAnimations } from "@quarto-video/registry";
import { ANIMATIONS, EXITS } from "../animations/index.js";

const sorted = (ids: readonly string[]) => [...ids].sort();

describe("registry and renderer animation parity", () => {
  it("maps exactly the preset ids the registry declares", () => {
    const registryIds = listAnimations().map((p) => p.id);
    expect(sorted([...Object.keys(ANIMATIONS), ...Object.keys(EXITS)])).toEqual(
      sorted(registryIds),
    );
  });

  it("maps each role to its own table: entrances to ANIMATIONS, exits to EXITS", () => {
    const presets = listAnimations();
    const entrances = presets.filter((p) => p.role === "entrance");
    const exits = presets.filter((p) => p.role === "exit");
    expect(sorted(Object.keys(ANIMATIONS))).toEqual(
      sorted(entrances.map((p) => p.id)),
    );
    expect(sorted(Object.keys(EXITS))).toEqual(sorted(exits.map((p) => p.id)));
  });

  it("maps every id to a frame function", () => {
    for (const preset of [
      ...Object.values(ANIMATIONS),
      ...Object.values(EXITS),
    ]) {
      expect(typeof preset).toBe("function");
    }
  });
});
