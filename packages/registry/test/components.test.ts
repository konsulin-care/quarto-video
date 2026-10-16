import { describe, expect, it } from "vitest";
import { getComponent, listComponents, RegistryError } from "../src/index.js";

describe("component lookups", () => {
  it("lists bullets with a list-only default slot of 2 to 6 items", () => {
    const bullets = getComponent("bullets");
    expect(bullets.slots).toEqual({
      default: {
        required: true,
        accepts: ["list"],
        items: { minItems: 2, maxItems: 6 },
      },
      heading: { required: false, accepts: ["heading"] },
    });
    expect(bullets.duration).toEqual({ minMs: 1000, maxMs: 30000 });
  });

  it("lists title with its slots, props and duration bounds", () => {
    const title = listComponents().find((c) => c.id === "title");
    expect(title).toBeDefined();
    expect(title?.slots).toEqual({
      default: {
        required: true,
        alternative: "text-overlay",
        accepts: ["paragraph", "heading"],
      },
      "text-overlay": {
        required: false,
        accepts: ["paragraph", "heading"],
        maxBlocks: 1,
      },
      subtitle: { required: false, accepts: ["paragraph"] },
    });
    expect(title?.props).toEqual({});
    expect(title?.placements).toEqual(["background"]);
    expect(title?.duration).toEqual({ minMs: 1000, maxMs: 30000 });
  });

  it("every alternative names a slot of the same contract", () => {
    for (const contract of listComponents()) {
      for (const [name, slot] of Object.entries(contract.slots)) {
        if (slot.alternative === undefined) continue;
        expect(
          contract.slots[slot.alternative],
          `${contract.id}.${name}`,
        ).toBeDefined();
      }
    }
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

  it("lists chart with its csv and column props (ADR-0014)", () => {
    const chart = getComponent("chart");
    expect(chart.props["data"]).toEqual({ type: "csv", required: true });
    expect(chart.props["x"]).toEqual({
      type: "column",
      of: "data",
      required: true,
    });
    expect(chart.props["y"]).toEqual({
      type: "column",
      of: "data",
      numeric: true,
      required: true,
    });
    expect(chart.props["type"]).toEqual({
      type: "enum",
      enum: ["bar", "line"],
      required: true,
    });
    expect(chart.duration).toEqual({ minMs: 2000, maxMs: 30000 });
  });

  it("rejects an unknown component id with an error, not undefined", () => {
    expect(() => getComponent("gallery")).toThrow(RegistryError);
    expect(() => getComponent("gallery")).toThrow(
      /unknown component "gallery" \(known: bullets, chart, comparison, end-card, image, section-divider, statement, statistic, title\)/,
    );
  });
});
