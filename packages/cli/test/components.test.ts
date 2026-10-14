import type { ComponentContract } from "@quarto-video/registry";
import { describe, expect, it } from "vitest";
import { formatComponentsTable } from "../src/commands/components.js";

const sample: ComponentContract = {
  id: "statement",
  version: "2.1.0",
  purpose: "A key message.",
  slots: {
    default: { required: true, accepts: ["paragraph"] },
    source: { required: false, accepts: ["paragraph", "list"] },
  },
  props: {
    fit: { type: "enum", enum: ["cover", "contain"] },
    emphasis: { type: "boolean" },
  },
  placements: [],
  compatibleAnimations: [],
  compatibleTransitions: [],
  duration: { minMs: 750, maxMs: 4000 },
  accessibility: "Text only.",
};

describe("video components table", () => {
  it("shows every column, with durations in the author's syntax", () => {
    expect(formatComponentsTable([sample])).toBe(
      [
        "ID         VERSION  DURATION  SLOTS                                                              PROPS",
        "statement  2.1.0    750ms-4s  default (required: paragraph); source (optional: paragraph, list)  emphasis (boolean); fit (enum: cover|contain)",
        "",
      ].join("\n"),
    );
  });

  it("prints none for a component with no props", () => {
    const bare = { ...sample, props: {} };
    expect(formatComponentsTable([bare]).trimEnd().endsWith("none")).toBe(true);
  });
});
