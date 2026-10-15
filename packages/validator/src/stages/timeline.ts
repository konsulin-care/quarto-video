// Stage 4 timeline checks (PRD §8.3; ADR-0005): transition names, durations
// (task 022: each preset's bounds), lengths and overlaps, and that the
// manifest's timeline is the one its scenes resolve to.
// Pure: the transition presets are passed in. Negative values never reach this
// stage: the filter (ADR-0003) and the IR schema (minimum 0) reject them first.
// IR 0.1 and 0.2 have no transitions or timeline, so there is nothing to check.
import {
  hasTimeline,
  resolveTimeline,
  type IrSceneV03,
  type IrVideo,
  type IrVideoWithTimeline,
} from "@quarto-video/ir";
import type { TransitionPreset } from "@quarto-video/registry";
import type { Diagnostic, DiagnosticCode } from "../diagnostic.js";
import { seconds } from "./contract.js";

type Where = Pick<Diagnostic, "file" | "line" | "sceneId" | "component">;

function where(scene: IrSceneV03): Where {
  const { file, line } = scene.source;
  return {
    file,
    ...(line === undefined ? {} : { line }),
    sceneId: scene.id,
    component: scene.component,
  };
}

function problem(
  scene: IrSceneV03,
  code: DiagnosticCode,
  message: string,
  suggestion: string,
): Diagnostic {
  return {
    severity: "error",
    code,
    message,
    ...where(scene),
    property: "transition",
    suggestion,
  };
}

/** Frames as the author sees them: "45 frames (1.5s)" at `fps`. */
function framesText(frames: number, fps: number): string {
  return `${frames} frames (${seconds((frames * 1000) / fps)})`;
}

/** Transition checks for the scenes at `index`, given its neighbours. */
function checkScene(
  scenes: readonly IrSceneV03[],
  index: number,
  transitions: readonly TransitionPreset[],
  fps: number,
): Diagnostic[] {
  const scene = scenes[index];
  if (scene === undefined) return [];
  const found: Diagnostic[] = [];
  const transition = scene.transition;
  const preset = transitions.find((t) => t.id === transition?.name);
  const names = transitions.map((t) => t.id).join(", ");
  if (transition !== undefined && preset === undefined) {
    found.push(
      problem(
        scene,
        "E_TRANSITION_UNKNOWN",
        `Unknown transition "${transition.name}" on scene "${scene.id}".`,
        `Known transitions: ${names}.`,
      ),
    );
  }
  if (transition !== undefined && preset !== undefined) {
    const bounds = preset.duration;
    const frames = transition.durationFrames;
    if (
      frames * 1000 < bounds.minMs * fps ||
      frames * 1000 > bounds.maxMs * fps
    ) {
      found.push(
        problem(
          scene,
          "E_TRANSITION_DURATION",
          `Transition "${preset.id}" on scene "${scene.id}" lasts ${framesText(frames, fps)}; "${preset.id}" takes ${seconds(bounds.minMs)} to ${seconds(bounds.maxMs)}.`,
          preset.id === "cut"
            ? "Remove transitionDuration: cut takes no frames."
            : `Use a transitionDuration from ${seconds(bounds.minMs)} to ${seconds(bounds.maxMs)}.`,
        ),
      );
    }
  }
  const incoming = index > 0 ? (transition?.durationFrames ?? 0) : 0;
  if (index === 0 && (transition?.durationFrames ?? 0) > 0) {
    found.push(
      problem(
        scene,
        "E_TRANSITION_FIRST_SCENE",
        `The first scene "${scene.id}" has a transition, but no earlier scene to overlap.`,
        "Remove the transition from the first scene, or use cut.",
      ),
    );
  }
  const previous = scenes[index - 1];
  if (previous !== undefined && incoming > 0) {
    const shorter = incoming > previous.durationFrames ? previous : scene;
    if (incoming > shorter.durationFrames) {
      found.push(
        problem(
          scene,
          "E_TRANSITION_TOO_LONG",
          `Transition "${transition?.name ?? ""}" into scene "${scene.id}" lasts ${framesText(incoming, fps)}, longer than scene "${shorter.id}" (${framesText(shorter.durationFrames, fps)}).`,
          `Use a transition no longer than either scene, for example ${framesText(shorter.durationFrames, fps)} or less.`,
        ),
      );
    }
  }
  // Two transitions that each fit the scene but together do not. A transition
  // that is too long on its own is reported above, not here.
  const outgoing = scenes[index + 1]?.transition?.durationFrames ?? 0;
  const length = scene.durationFrames;
  if (
    incoming <= length &&
    outgoing <= length &&
    incoming + outgoing > length
  ) {
    found.push(
      problem(
        scene,
        "E_TRANSITION_OVERLAP",
        `The transitions on scene "${scene.id}" overlap: ${framesText(incoming, fps)} in and ${framesText(outgoing, fps)} out, in a scene of ${framesText(scene.durationFrames, fps)}.`,
        "Shorten a transition, or lengthen the scene, so the two do not overlap.",
      ),
    );
  }
  return found;
}

/** The first place where the manifest's timeline differs from the resolved one. */
function checkTimelineSection(ir: IrVideoWithTimeline): Diagnostic[] {
  const scenes = ir.scenes;
  const expected = resolveTimeline(scenes);
  const actual = ir.timeline;
  const last = scenes[scenes.length - 1];
  const mismatch = (
    scene: IrSceneV03 | undefined,
    message: string,
  ): Diagnostic[] =>
    scene === undefined
      ? []
      : [
          {
            severity: "error",
            code: "E_TIMELINE_MISMATCH",
            message,
            ...where(scene),
            property: "timeline",
            suggestion: "This is a filter bug: rerun the render and report it.",
          },
        ];
  if (actual.scenes.length !== scenes.length) {
    return mismatch(
      scenes[0],
      `The timeline lists ${actual.scenes.length} scenes; the manifest has ${scenes.length}.`,
    );
  }
  for (const [index, entry] of expected.scenes.entries()) {
    const got = actual.scenes[index];
    if (got?.id !== entry.id || got.startFrame !== entry.startFrame) {
      return mismatch(
        scenes[index],
        `The timeline starts scene "${entry.id}" at frame ${got?.startFrame ?? "?"}; the scenes give frame ${entry.startFrame}.`,
      );
    }
  }
  if (actual.durationFrames !== expected.durationFrames) {
    return mismatch(
      last,
      `The timeline lasts ${actual.durationFrames} frames; the scenes give ${expected.durationFrames}.`,
    );
  }
  return [];
}

/** Every timeline error in `ir`, scene by scene in order. IR 0.2 yields none. */
export function checkTimeline(
  ir: IrVideo,
  transitions: readonly TransitionPreset[],
): Diagnostic[] {
  if (!hasTimeline(ir)) return [];
  const fps = ir.settings.fps;
  const found = ir.scenes.flatMap((_scene, index) =>
    checkScene(ir.scenes, index, transitions, fps),
  );
  return [...found, ...checkTimelineSection(ir)];
}
