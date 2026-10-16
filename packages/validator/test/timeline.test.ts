// Stage 4 timeline rules (PRD §8.3; ADR-0005), against synthetic IR 0.3
// manifests. Fixtures in tests/fixtures/projects/timeline-* cover the same
// codes through the CLI (tests/integration/timeline.test.ts).
import type { IrVideoV03, IrSceneV03 } from "@quarto-video/ir";
import type {
  ComponentContract,
  TransitionPreset,
} from "@quarto-video/registry";
import { describe, expect, it } from "vitest";
import { checkTimeline } from "../src/stages/timeline.js";
import { checkManifest } from "../src/run.js";

/** The cut and fade presets, with the shipped duration bounds. */
const PRESETS: TransitionPreset[] = [
  {
    id: "cut",
    version: "1.0.0",
    purpose: "Test cut.",
    duration: { defaultMs: 0, minMs: 0, maxMs: 0 },
    reducedMotion: "cut",
  },
  {
    id: "fade",
    version: "1.0.0",
    purpose: "Test fade.",
    duration: { defaultMs: 500, minMs: 100, maxMs: 3000 },
    reducedMotion: "fade",
  },
];
const TITLE: ComponentContract = {
  id: "title",
  version: "1.0.0",
  purpose: "Test component.",
  slots: { default: { required: true, accepts: ["paragraph", "heading"] } },
  props: {},
  placements: [],
  compatibleAnimations: [],
  compatibleTransitions: [],
  duration: { minMs: 1000, maxMs: 30000 },
  accessibility: "Test only.",
};

/** A scene; `inFrames` makes its incoming transition (fade unless named). */
function scene(
  id: string,
  durationFrames: number,
  inFrames?: number,
  name = "fade",
): IrSceneV03 {
  return {
    id,
    component: "title",
    durationFrames,
    ...(inFrames === undefined
      ? {}
      : { transition: { name, durationFrames: inFrames } }),
    content: {
      slots: {
        default: [
          { type: "paragraph", inlines: [{ type: "text", text: "x" }] },
        ],
      },
    },
    source: { file: "index.qmd", line: 3 },
  };
}

/** A 0.3 manifest whose timeline is resolved from its scenes, unless `timeline` is given. */
function doc(
  scenes: IrSceneV03[],
  timeline?: IrVideoV03["timeline"],
): IrVideoV03 {
  const starts: { id: string; startFrame: number }[] = [];
  let start = 0;
  scenes.forEach((s, index) => {
    if (index > 0) {
      start +=
        (scenes[index - 1]?.durationFrames ?? 0) -
        (s.transition?.durationFrames ?? 0);
    }
    starts.push({ id: s.id, startFrame: start });
  });
  const last = scenes[scenes.length - 1];
  const total = last ? start + last.durationFrames : 0;
  return {
    schemaVersion: "0.3",
    type: "video",
    settings: { width: 1920, height: 1080, fps: 30, background: "#000000" },
    scenes,
    timeline: timeline ?? { durationFrames: total, scenes: starts },
  };
}

const codes = (ir: IrVideoV03): string[] =>
  checkTimeline(ir, PRESETS).map((d) => d.code);

describe("timeline rules", () => {
  it("accepts scenes with no transitions, one after another", () => {
    const ir = doc([scene("a", 120), scene("b", 120), scene("c", 120)]);
    expect(checkTimeline(ir, PRESETS)).toEqual([]);
    expect(ir.timeline.durationFrames).toBe(360);
  });

  it("accepts all scenes overlapping by their fades", () => {
    const ir = doc([scene("a", 120), scene("b", 120, 30), scene("c", 120, 30)]);
    expect(checkTimeline(ir, PRESETS)).toEqual([]);
    expect(ir.timeline).toEqual({
      durationFrames: 300,
      scenes: [
        { id: "a", startFrame: 0 },
        { id: "b", startFrame: 90 },
        { id: "c", startFrame: 180 },
      ],
    });
  });

  it("accepts a mix of a cut and a fade", () => {
    const ir = doc([
      scene("a", 120),
      scene("b", 60, 0, "cut"),
      scene("c", 120, 30),
    ]);
    expect(checkTimeline(ir, PRESETS)).toEqual([]);
    expect(ir.timeline.scenes.map((s) => s.startFrame)).toEqual([0, 120, 150]);
  });

  it("accepts a transition on the last scene", () => {
    expect(codes(doc([scene("a", 120), scene("b", 120, 30)]))).toEqual([]);
  });

  it("rejects a transition on the first scene", () => {
    expect(codes(doc([scene("a", 120, 30), scene("b", 120)]))).toEqual([
      "E_TRANSITION_FIRST_SCENE",
    ]);
  });

  it("accepts a cut on the first scene, which overlaps nothing", () => {
    expect(
      codes(doc([scene("a", 120, 0, "cut"), scene("b", 120, 30)])),
    ).toEqual([]);
  });

  it("accepts a transition equal to the length of the shorter scene", () => {
    expect(codes(doc([scene("a", 120), scene("b", 30, 30)]))).toEqual([]);
  });

  it("rejects a transition longer than the scene it enters", () => {
    expect(codes(doc([scene("a", 120), scene("b", 30, 31)]))).toEqual([
      "E_TRANSITION_TOO_LONG",
    ]);
  });

  it("rejects a transition longer than the scene it leaves", () => {
    expect(codes(doc([scene("a", 30), scene("b", 120, 31)]))).toEqual([
      "E_TRANSITION_TOO_LONG",
    ]);
  });

  it("names the shorter scene in the too-long message", () => {
    const [found] = checkTimeline(
      doc([scene("a", 30), scene("b", 120, 60)]),
      PRESETS,
    );
    expect(found?.message).toContain('scene "a" (30 frames (1s))');
    expect(found?.sceneId).toBe("b");
    expect(found?.line).toBe(3);
  });

  it("rejects two transitions on one scene that overlap inside it", () => {
    const ir = doc([scene("a", 120), scene("b", 60, 40), scene("c", 120, 30)]);
    expect(codes(ir)).toEqual(["E_TRANSITION_OVERLAP"]);
  });

  it("accepts two transitions on one scene that fit inside it", () => {
    const ir = doc([scene("a", 120), scene("b", 60, 30), scene("c", 120, 30)]);
    expect(codes(ir)).toEqual([]);
  });

  it("rejects an unknown transition name, and lists the known ones", () => {
    const ir = doc([scene("a", 120), scene("b", 120, 30, "spin")]);
    const [found] = checkTimeline(ir, PRESETS);
    expect(found?.code).toBe("E_TRANSITION_UNKNOWN");
    expect(found?.suggestion).toBe("Known transitions: cut, fade.");
  });

  it("rejects a timeline that disagrees with its scenes", () => {
    const ir = doc([scene("a", 120), scene("b", 120, 30)], {
      durationFrames: 240,
      scenes: [
        { id: "a", startFrame: 0 },
        { id: "b", startFrame: 120 },
      ],
    });
    const [found] = checkTimeline(ir, PRESETS);
    expect(found?.code).toBe("E_TIMELINE_MISMATCH");
    expect(found?.message).toBe(
      'The timeline starts scene "b" at frame 120; the scenes give frame 90.',
    );
  });

  it("rejects a timeline total that disagrees with its scenes", () => {
    const ir = doc([scene("a", 120)], {
      durationFrames: 100,
      scenes: [{ id: "a", startFrame: 0 }],
    });
    expect(checkTimeline(ir, PRESETS).map((d) => d.message)).toEqual([
      "The timeline lasts 100 frames; the scenes give 120.",
    ]);
  });

  it("rejects a timeline that lists a different number of scenes", () => {
    const ir = doc([scene("a", 120), scene("b", 120)], {
      durationFrames: 240,
      scenes: [{ id: "a", startFrame: 0 }],
    });
    expect(codes(ir)).toEqual(["E_TIMELINE_MISMATCH"]);
  });

  it("checks nothing in IR 0.2, which has no timeline", () => {
    const ir = {
      schemaVersion: "0.2" as const,
      type: "video" as const,
      settings: { width: 1920, height: 1080, fps: 30, background: "#000000" },
      scenes: [scene("a", 120)],
    };
    expect(checkTimeline(ir, PRESETS)).toEqual([]);
  });
});

describe("checkManifest with stage 4", () => {
  it("stops before stage 4 when the contracts fail", () => {
    const ir = doc([scene("a", 120), scene("b", 30, 31)]);
    const check = checkManifest(ir, "m.json", [], PRESETS);
    expect(check.ir).toBeNull();
    expect(new Set(check.diagnostics.map((d) => d.code))).toEqual(
      new Set(["E_COMPONENT_UNKNOWN"]),
    );
  });

  it("reports a bad transition with the scene's line when the contracts pass", () => {
    const ir = doc([scene("a", 120), scene("b", 30, 31)]);
    const [found] = checkManifest(ir, "m.json", [TITLE], PRESETS).diagnostics;
    expect(found).toMatchObject({
      code: "E_TRANSITION_TOO_LONG",
      file: "index.qmd",
      line: 3,
    });
  });
});

describe("transition durations and registered names (task 022)", () => {
  it("accepts a transition at the preset's minimum and maximum", () => {
    expect(codes(doc([scene("a", 300), scene("b", 300, 3)]))).toEqual([]);
    expect(codes(doc([scene("a", 300), scene("b", 300, 90)]))).toEqual([]);
  });

  it("rejects a transition shorter than the preset's minimum", () => {
    const [found] = checkTimeline(
      doc([scene("a", 300), scene("b", 300, 2)]),
      PRESETS,
    );
    expect(found?.code).toBe("E_TRANSITION_DURATION");
    expect(found?.message).toContain('"fade" takes 0.1s to 3s');
    expect(found?.suggestion).toBe("Use a transitionDuration from 0.1s to 3s.");
  });

  it("rejects a transition longer than the preset's maximum", () => {
    const ir = doc([scene("a", 300), scene("b", 300, 91)]);
    expect(codes(ir)).toEqual(["E_TRANSITION_DURATION"]);
  });

  it("lists every registered transition for an unknown name", () => {
    const ir = doc([scene("a", 120), scene("b", 120, 30, "spin")]);
    const check = checkManifest(ir, "m.json", [TITLE]);
    expect(check.diagnostics.map((d) => d.code)).toEqual([
      "E_TRANSITION_UNKNOWN",
    ]);
    expect(check.diagnostics[0]?.suggestion).toBe(
      "Known transitions: cut, fade, slide, wipe, zoom.",
    );
  });

  it("accepts each shipped motion transition by name", () => {
    for (const name of ["slide", "wipe", "zoom"]) {
      const ir = doc([scene("a", 120), scene("b", 120, 30, name)]);
      expect(checkManifest(ir, "m.json", [TITLE]).diagnostics).toEqual([]);
    }
  });
});
