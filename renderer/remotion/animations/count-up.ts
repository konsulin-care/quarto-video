// count-up (registry: animations/count-up.json; task 032): the value of a
// statistic counts up from zero to its exact value. The schedule is a pure
// function of the value, the frame and the scene's length. The count runs from
// frame 0 to `settle` = ceil(0.7 * durationFrames), eases out (curve.ts), and
// is exactly `value` from `settle` on, so the final text is shown by 70% of the
// scene. The scene itself does not move: the statistic reads the counted value
// (count-motion.ts). A scene under the registry minimum, or reduced motion,
// shows `value` from the first frame (static).
import preset from "@quarto-video/registry/animations/count-up.json" with { type: "json" };
import { easeOut } from "./curve.js";
import type { AnimationFn } from "./types.js";

/** The share of the scene by which the count has reached the value. */
export const COUNT_SETTLE_SHARE = 0.7;

/** The frame by which the count has reached the value: ceil(0.7 * durationFrames). */
export function countSettleFrame(durationFrames: number): number {
  return Math.ceil(COUNT_SETTLE_SHARE * durationFrames);
}

/**
 * The number shown at `frame` of a scene `durationFrames` long, counting up to
 * `value`. It is `value * easeOut(frame / settle)`, so it is 0 at frame 0 and
 * `value` exactly from the settle frame on. Its magnitude never decreases, and
 * it never passes `value`. A scene shorter than the registry minimum, or
 * reduced motion, shows `value` from the first frame.
 */
export function countUpValue(
  value: number,
  frame: number,
  durationFrames: number,
  reducedMotion = false,
): number {
  if (reducedMotion || durationFrames < preset.minFrames) return value;
  const settle = countSettleFrame(durationFrames);
  return value * easeOut(frame / settle);
}

/** The scene itself does not move under count-up; its statistic does (countUpValue). */
export const countUp: AnimationFn = () => ({});
