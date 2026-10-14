// Parity between the registry and the renderer (packages/registry/README.md):
// every registry id has a renderer implementation and every implementation
// has a registry id. The renderer may import the registry (AGENT.md).
import { describe, expect, it } from "vitest";
import { listComponents } from "@quarto-video/registry";
import { COMPONENTS } from "../src/registry-map.js";

describe("registry and renderer parity", () => {
  it("maps exactly the component ids the registry declares", () => {
    const registryIds = listComponents().map((c) => c.id);
    expect(Object.keys(COMPONENTS).sort()).toEqual([...registryIds].sort());
  });

  it("maps every id to a component function", () => {
    for (const component of Object.values(COMPONENTS)) {
      expect(typeof component).toBe("function");
    }
  });
});
