// Stage 2 window checks (ADR-0020): `animationDuration` sets the length, in
// frames, of a scene's entrance and exit windows. It needs an animation or an
// exit, a preset that runs over a window (registry `windowed`), a length of at
// most the scene's length, and room for both windows when both are set. A
// scene without animationDuration keeps the default window (curve.ts). Pure.
import type { IrVideoV112 } from "@quarto-video/ir";
import type { AnimationPreset } from "@quarto-video/registry";
import type { Diagnostic } from "../diagnostic.js";
import { sceneProblem } from "./animation.js";

/** Every E_ANIMATION_DURATION error in `ir`, scene by scene in document order. */
export function checkWindows(
  ir: Pick<IrVideoV112, "scenes">,
  presets: readonly AnimationPreset[],
): Diagnostic[] {
  const known = new Map(presets.map((p) => [p.id, p]));
  return ir.scenes.flatMap((scene): Diagnostic[] => {
    const frames = scene.animationDurationFrames;
    if (frames === undefined) return [];
    const entrance = scene.animation?.name;
    const exit = scene.exit?.name;
    const fail = (message: string, suggestion: string): Diagnostic[] => [
      sceneProblem(
        scene,
        "E_ANIMATION_DURATION",
        message,
        suggestion,
        "animationDuration",
      ),
    ];
    if (entrance === undefined && exit === undefined) {
      return fail(
        `Scene "${scene.id}" has animationDuration but no animation or exit.`,
        'Add animation="fade-in" or exit="fade-out", or remove animationDuration.',
      );
    }
    for (const name of [entrance, exit]) {
      const preset = name === undefined ? undefined : known.get(name);
      if (preset !== undefined && !preset.windowed) {
        return fail(
          `"${preset.id}" runs on its own schedule, so animationDuration does not apply to scene "${scene.id}".`,
          "Remove animationDuration, or use a preset with a window such as fade-in.",
        );
      }
    }
    const length = scene.durationFrames;
    if (frames > length) {
      return fail(
        `Scene "${scene.id}" has animationDuration of ${frames} frames, longer than the scene (${length} frames).`,
        "Use an animationDuration no longer than the scene.",
      );
    }
    if (entrance !== undefined && exit !== undefined && 2 * frames > length) {
      return fail(
        `Scene "${scene.id}": the animation and exit windows of ${frames} frames each overlap in ${length} frames.`,
        "Shorten animationDuration so both windows fit in the scene.",
      );
    }
    return [];
  });
}
