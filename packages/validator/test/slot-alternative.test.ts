// The `alternative` slot rule (task 039): a required slot is filled by its own
// blocks or by its alternative's, and the two are exclusive. Synthetic contract.
import type { ComponentContract } from "@quarto-video/registry";
import type { IrSceneV02, IrVideoV02 } from "@quarto-video/ir";
import { describe, expect, it } from "vitest";
import { checkContracts } from "../src/stages/contract.js";

const OVERLAY: ComponentContract = {
  id: "overlay",
  version: "1.0.0",
  purpose: "Test component.",
  slots: {
    default: {
      required: true,
      alternative: "text-overlay",
      accepts: ["paragraph"],
    },
    "text-overlay": { required: false, accepts: ["paragraph"], maxBlocks: 1 },
  },
  props: {},
  placements: ["background"],
  compatibleAnimations: [],
  compatibleTransitions: [],
  duration: { minMs: 1000, maxMs: 30000 },
  accessibility: "Test only.",
};

const paragraph = [{ type: "paragraph" as const, inlines: [] }];

function run(slots: IrSceneV02["content"]["slots"]) {
  const scene: IrSceneV02 = {
    id: "intro",
    component: "overlay",
    durationFrames: 60,
    content: { slots },
    source: { file: "index.qmd", line: 2 },
  };
  const ir: IrVideoV02 = {
    schemaVersion: "0.2",
    type: "video",
    settings: { width: 640, height: 360, fps: 30, background: "#000000" },
    scenes: [scene],
  };
  return checkContracts(ir, [OVERLAY]).map((d) => d.code);
}

describe("slot alternatives", () => {
  it("accepts text in the default slot alone", () => {
    expect(run({ default: paragraph })).toEqual([]);
  });

  it("accepts text in the alternative slot alone", () => {
    expect(run({ "text-overlay": paragraph })).toEqual([]);
  });

  it("requires one of the two, and says so", () => {
    const found = checkContracts(
      {
        settings: { width: 640, height: 360, fps: 30, background: "#000000" },
        scenes: [
          {
            id: "intro",
            component: "overlay",
            durationFrames: 60,
            content: { slots: {} },
            source: { file: "index.qmd", line: 2 },
          },
        ],
      },
      [OVERLAY],
    );
    expect(found.map((d) => d.code)).toEqual(["E_SLOT_REQUIRED"]);
    expect(found[0]?.message).toBe(
      'Component "overlay" needs content in slot "default" or in slot "text-overlay".',
    );
  });

  it("rejects both slots filled, once", () => {
    expect(run({ default: paragraph, "text-overlay": paragraph })).toEqual([
      "E_SLOT_CONSTRAINT",
    ]);
  });
});
