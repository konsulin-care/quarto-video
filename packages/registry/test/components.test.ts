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

  it("returns copies, so a caller cannot change the registry", () => {
    const first = getComponent("title");
    first.slots["default"] = { required: false, accepts: ["list"] };
    expect(getComponent("title").slots["default"]?.required).toBe(true);
  });

  it("lists chart with its csv and column props (ADR-0013)", () => {
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
    expect(() => getComponent("statistic")).toThrow(RegistryError);
    expect(() => getComponent("statistic")).toThrow(
      /unknown component "statistic" \(known: chart, title\)/,
    );
  });
});
