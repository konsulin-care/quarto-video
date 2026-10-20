// Scene exits and animation windows at stage 2 (ADR-0020): an exit is an
// exit-role preset that applies to the component; animationDuration sets the
// window of the entrance and exit, which must be a windowed preset, no longer
// than the scene, and room for both windows when both are set.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  listAnimations,
  listComponents,
  listTransitionPresets,
  type AnimationPreset,
  type ComponentContract,
} from "@quarto-video/registry";
import type { IrVideoV112 } from "@quarto-video/ir";
import { checkManifest } from "../src/index.js";
import { checkWindows } from "../src/stages/windows.js";

type Doc = Record<string, unknown>;

const example = (): Doc =>
  JSON.parse(
    readFileSync(
      new URL("../../ir/examples/v1.12.json", import.meta.url),
      "utf8",
    ),
  ) as Doc;

/** The 1.12 example with `edit` applied to its first scene (120 frames). */
function edited(edit: (scene: Doc) => void): Doc {
  const doc = example();
  edit((doc["scenes"] as Doc[])[0] as Doc);
  return doc;
}

/** The E_ANIMATION_* diagnostics of a run: the other example scenes are not about motion. */
const motionOf = (json: unknown, components?: readonly ComponentContract[]) =>
  run(json, components).diagnostics.filter((d) =>
    d.code.startsWith("E_ANIMATION"),
  );

const run = (
  json: unknown,
  components: readonly ComponentContract[] = listComponents(),
) =>
  checkManifest(
    json,
    "index.qmd",
    components,
    listTransitionPresets(),
    undefined,
    listAnimations(),
  );

/** A copy of the registry's contracts with `remove` taken off `title`'s animations. */
function titleWithout(remove: string): ComponentContract[] {
  return listComponents().map((c) =>
    c.id === "title"
      ? {
          ...c,
          compatibleAnimations: c.compatibleAnimations.filter(
            (id) => id !== remove,
          ),
        }
      : c,
  );
}

/** A scene of `frames` with the given motion, for the window rules alone. */
function windowScene(frames: number, motion: Partial<Doc> = {}): IrVideoV112 {
  return {
    schemaVersion: "1.12",
    type: "video",
    scenes: [
      {
        id: "scene-001",
        component: "title",
        durationFrames: frames,
        content: { slots: {} },
        source: { file: "index.qmd", line: 3 },
        ...motion,
      },
    ],
  } as unknown as IrVideoV112;
}

const windows = (
  frames: number,
  motion: Partial<Doc>,
  presets: readonly AnimationPreset[] = listAnimations(),
) => checkWindows(windowScene(frames, motion), presets);

describe("scene exit (stage 2)", () => {
  it("passes the 1.12 example: an entrance, a fade-out exit and a 30-frame window", () => {
    expect(motionOf(example())).toEqual([]);
  });

  it("reports an unknown exit, listing the exit presets", () => {
    const [found] = motionOf(edited((s) => (s["exit"] = { name: "spin" })));
    expect(found).toMatchObject({
      code: "E_ANIMATION_UNKNOWN",
      property: "exit",
      sceneId: "scene-001",
      message: 'Unknown exit "spin" on scene "scene-001".',
      suggestion: "Known exits: fade-out.",
    });
  });

  it("reports an entrance preset used as an exit, and the reverse", () => {
    const asExit = motionOf(edited((s) => (s["exit"] = { name: "fade-in" })));
    expect(asExit[0]).toMatchObject({
      code: "E_ANIMATION_UNKNOWN",
      property: "exit",
      message:
        'Scene "scene-001" uses "fade-in" as exit, but it is an entrance preset.',
      suggestion: 'Use animation="fade-in" instead.',
    });
    const asAnimation = motionOf(
      edited((s) => (s["animation"] = { name: "fade-out" })),
    );
    expect(asAnimation[0]).toMatchObject({
      code: "E_ANIMATION_UNKNOWN",
      property: "animation",
      suggestion: 'Use exit="fade-out" instead.',
    });
  });

  it("reports an exit that does not apply to the component", () => {
    const [found] = motionOf(
      edited((s) => (s["component"] = "title")),
      titleWithout("fade-out"),
    );
    expect(found).toMatchObject({
      code: "E_ANIMATION_INCOMPATIBLE",
      property: "exit",
      message: 'Exit "fade-out" does not apply to component "title".',
    });
    expect(found?.suggestion).not.toContain("fade-out");
  });

  it("names an entrance animation that does not apply, with entrances only in the list", () => {
    const [found] = motionOf(
      edited((s) => {
        s["component"] = "title";
        s["animation"] = { name: "kinetic" };
      }),
    );
    expect(found).toMatchObject({
      code: "E_ANIMATION_INCOMPATIBLE",
      property: "animation",
      message: 'Animation "kinetic" does not apply to component "title".',
      suggestion: 'Animations for "title": fade-in, reveal, slide-up.',
    });
  });
});

describe("animation window (stage 2, E_ANIMATION_DURATION)", () => {
  it("passes a default window, with no animationDuration", () => {
    expect(windows(120, { animation: { name: "fade-in" } })).toEqual([]);
  });

  it("passes a window of the whole scene", () => {
    expect(
      windows(120, {
        animation: { name: "fade-in" },
        animationDurationFrames: 120,
      }),
    ).toEqual([]);
  });

  it("rejects a window longer than the scene", () => {
    const [found] = windows(120, {
      animation: { name: "fade-in" },
      animationDurationFrames: 121,
    });
    expect(found).toMatchObject({
      code: "E_ANIMATION_DURATION",
      property: "animationDuration",
      sceneId: "scene-001",
      line: 3,
    });
    expect(found?.message).toContain(
      "121 frames, longer than the scene (120 frames)",
    );
  });

  it("accepts entrance and exit windows that exactly fill the scene, and rejects one frame more", () => {
    const motion = {
      animation: { name: "fade-in" },
      exit: { name: "fade-out" },
    };
    expect(windows(120, { ...motion, animationDurationFrames: 60 })).toEqual(
      [],
    );
    const [found] = windows(120, { ...motion, animationDurationFrames: 61 });
    expect(found?.code).toBe("E_ANIMATION_DURATION");
    expect(found?.message).toContain("overlap");
  });

  it("rejects an animationDuration with neither an animation nor an exit", () => {
    const [found] = windows(120, { animationDurationFrames: 30 });
    expect(found).toMatchObject({
      code: "E_ANIMATION_DURATION",
      message:
        'Scene "scene-001" has animationDuration but no animation or exit.',
    });
  });

  it("rejects a window on a preset with its own schedule (kinetic)", () => {
    const [found] = windows(120, {
      animation: { name: "kinetic" },
      animationDurationFrames: 30,
    });
    expect(found).toMatchObject({ code: "E_ANIMATION_DURATION" });
    expect(found?.message).toContain('"kinetic" runs on its own schedule');
  });

  it("leaves an unknown preset to the animation check", () => {
    expect(
      windows(120, {
        animation: { name: "spin" },
        animationDurationFrames: 30,
      }),
    ).toEqual([]);
  });
});
