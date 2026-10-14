// Stage 2 contract rules (PRD §5.5, §9.1) against synthetic contracts, so each
// rule is tested without the shipped registry. Fixtures cover the same rules
// through the CLI (tests/integration/contract.test.ts).
import type { ComponentContract } from "@quarto-video/registry";
import type { IrSceneV02, IrVideoV02 } from "@quarto-video/ir";
import { describe, expect, it } from "vitest";
import { checkContracts } from "../src/stages/contract.js";

function contract(
  id: string,
  slots: ComponentContract["slots"],
  duration = { minMs: 1000, maxMs: 30000 },
): ComponentContract {
  return {
    id,
    version: "1.0.0",
    purpose: "Test component.",
    slots,
    props: {},
    placements: [],
    compatibleAnimations: [],
    compatibleTransitions: [],
    duration,
    accessibility: "Test only.",
  };
}

const TITLE = contract("title", {
  default: { required: true, accepts: ["paragraph", "heading"] },
});
const PAIR = contract("pair", {
  default: { required: true, accepts: ["paragraph"] },
  caption: { required: true, accepts: ["paragraph"] },
});

function scene(
  component: string,
  slots: IrSceneV02["content"]["slots"],
  durationFrames = 60,
  id = "intro",
): IrSceneV02 {
  return {
    id,
    component,
    durationFrames,
    content: { slots },
    source: { file: "index.qmd", line: 7 },
  };
}

const paragraph = [{ type: "paragraph" as const, inlines: [] }];

function doc(...scenes: IrSceneV02[]): IrVideoV02 {
  return {
    schemaVersion: "0.2",
    type: "video",
    settings: { width: 1920, height: 1080, fps: 30, background: "#000000" },
    scenes,
  };
}

describe("contract checks", () => {
  it("accepts a scene whose slots and duration match the contract", () => {
    const heading = [{ type: "heading" as const, level: 1, inlines: [] }];
    const ir = doc(scene("title", { default: [...paragraph, ...heading] }));
    expect(checkContracts(ir, [TITLE])).toEqual([]);
  });

  it("reports an unknown component with the available ones, and checks nothing else", () => {
    const ir = doc(scene("hero-title", { left: paragraph }, 1));
    const found = checkContracts(ir, [TITLE, PAIR]);
    expect(found).toEqual([
      {
        severity: "error",
        code: "E_COMPONENT_UNKNOWN",
        message: 'Unknown component "hero-title".',
        file: "index.qmd",
        line: 7,
        sceneId: "intro",
        component: "hero-title",
        property: "component",
        suggestion: "Available components: pair, title.",
      },
    ]);
  });

  it("does not treat prototype names as components or slots", () => {
    const ir = doc(scene("constructor", {}));
    expect(checkContracts(ir, [TITLE])[0]?.code).toBe("E_COMPONENT_UNKNOWN");
    const slotNamed = doc(scene("title", { constructor: paragraph }));
    expect(checkContracts(slotNamed, [TITLE]).map((d) => d.code)).toEqual([
      "E_SLOT_UNKNOWN",
      "E_SLOT_REQUIRED",
    ]);
  });

  it("reports each unknown slot and each required slot that is missing", () => {
    const ir = doc(scene("pair", { left: paragraph, right: paragraph }));
    const codes = checkContracts(ir, [PAIR]).map((d) => [d.code, d.property]);
    expect(codes).toEqual([
      ["E_SLOT_UNKNOWN", "slots.left"],
      ["E_SLOT_UNKNOWN", "slots.right"],
      ["E_SLOT_REQUIRED", "slots.caption"],
      ["E_SLOT_REQUIRED", "slots.default"],
    ]);
  });

  it("reports a block kind the slot does not accept, once per kind", () => {
    const list = [
      { type: "list" as const, ordered: false, items: [] },
      { type: "list" as const, ordered: true, items: [] },
    ];
    const ir = doc(scene("title", { default: [...paragraph, ...list] }));
    const found = checkContracts(ir, [TITLE]);
    expect(found.map((d) => d.code)).toEqual(["E_SLOT_BLOCK_KIND"]);
    expect(found[0]?.message).toBe(
      'Slot "default" of component "title" does not accept "list" blocks.',
    );
    expect(found[0]?.suggestion).toBe(
      'Slot "default" accepts paragraph, heading.',
    );
  });

  it("reports a missing required slot other than the default one", () => {
    const ir = doc(scene("pair", { default: paragraph }));
    expect(checkContracts(ir, [PAIR]).map((d) => d.code)).toEqual([
      "E_SLOT_REQUIRED",
    ]);
  });

  it("treats duration bounds as inclusive, in frames at the scene's fps", () => {
    const at = (frames: number) =>
      checkContracts(doc(scene("title", { default: paragraph }, frames)), [
        TITLE,
      ]);
    expect(at(30)).toEqual([]); // 1s
    expect(at(900)).toEqual([]); // 30s
    expect(at(29)[0]?.code).toBe("E_DURATION_BOUNDS");
    expect(at(901)[0]?.code).toBe("E_DURATION_BOUNDS");
  });

  it("explains a duration outside the bounds in author units", () => {
    const short = contract(
      "short",
      { default: { required: true, accepts: ["paragraph"] } },
      { minMs: 1000, maxMs: 30000 },
    );
    const found = checkContracts(
      doc(scene("short", { default: paragraph }, 15)),
      [short],
    );
    expect(found[0]).toMatchObject({
      code: "E_DURATION_BOUNDS",
      message: 'Scene "intro" lasts 0.5s; component "short" accepts 1s to 30s.',
      suggestion: "Use a duration from 1s to 30s.",
      property: "duration",
    });
  });

  it("reports every scene in document order", () => {
    const ir = doc(
      scene("hero-title", {}, 60, "first"),
      scene("title", {}, 60, "second"),
      scene("title", { default: paragraph }, 1, "third"),
    );
    expect(checkContracts(ir, [TITLE]).map((d) => [d.sceneId, d.code])).toEqual(
      [
        ["first", "E_COMPONENT_UNKNOWN"],
        ["second", "E_SLOT_REQUIRED"],
        ["third", "E_DURATION_BOUNDS"],
      ],
    );
  });
});
