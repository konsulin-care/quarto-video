import { describe, expect, it } from "vitest";
import { getComponent, listComponents, RegistryError } from "../src/index.js";

describe("component lookups", () => {
  it("lists title with its slots, props and duration bounds", () => {
    const title = listComponents().find((c) => c.id === "title");
    expect(title).toBeDefined();
    expect(title?.slots).toEqual({
      default: { required: true, accepts: ["paragraph", "heading"] },
      subtitle: { required: false, accepts: ["paragraph"] },
    });
    expect(title?.props).toEqual({});
    expect(title?.duration).toEqual({ minMs: 1000, maxMs: 30000 });
  });

  it("lists section-divider with a kicker slot and short duration bounds", () => {
    const divider = getComponent("section-divider");
    expect(divider.slots).toEqual({
      default: { required: true, accepts: ["paragraph", "heading"] },
      kicker: { required: false, accepts: ["paragraph"] },
    });
    expect(divider.duration).toEqual({ minMs: 1000, maxMs: 8000 });
    expect(divider.compatibleAnimations).toEqual(["fade-in", "slide-up"]);
  });

  it("returns copies, so a caller cannot change the registry", () => {
    const first = getComponent("title");
    first.slots["default"] = { required: false, accepts: ["list"] };
    expect(getComponent("title").slots["default"]?.required).toBe(true);
  });

  it("rejects an unknown component id with an error, not undefined", () => {
    expect(() => getComponent("statistic")).toThrow(RegistryError);
    expect(() => getComponent("statistic")).toThrow(
      /unknown component "statistic" \(known: end-card, section-divider, statement, title\)/,
    );
  });
});
