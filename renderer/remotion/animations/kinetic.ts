// kinetic (registry: animations/kinetic.json; task 026): the words of a statement
// appear one after another, each fading in while it rises into place. The
// schedule is a pure function of the word count and the scene's length. Word i
// starts at floor(i * span / words) frames, with span = settle - ENTER and
// settle = ceil(0.8 * durationFrames), so every word is in place by `settle`
// and the last fifth of the scene is still. The scene itself does not move: the
// statement styles each word (word-motion.ts). Its minimum comes from the registry.
import type { ThemeTokens } from "@quarto-video/registry";
import preset from "@quarto-video/registry/animations/kinetic.json" with { type: "json" };
import { css, easeOut } from "./curve.js";
import type { AnimationFn, AnimationStyle } from "./types.js";

/** Frames one word takes to appear: 0.2 s at 30 fps. */
export const KINETIC_ENTER_FRAMES = 6;

/** The share of the scene by which every word is in place. */
export const KINETIC_SETTLE_SHARE = 0.8;

/** When word i fades in: its first and its last entrance frame's start. */
export interface WordSlot {
  start: number;
  end: number;
}

/** The frame by which every word is in place: ceil(0.8 * durationFrames). */
export function settleFrame(durationFrames: number): number {
  return Math.ceil(KINETIC_SETTLE_SHARE * durationFrames);
}

/** Where each of `wordCount` words starts and ends its entrance in a scene of `durationFrames`. */
export function kineticSchedule(
  wordCount: number,
  durationFrames: number,
): WordSlot[] {
  const span = Math.max(0, settleFrame(durationFrames) - KINETIC_ENTER_FRAMES);
  return Array.from({ length: wordCount }, (_, index) => {
    const start = Math.floor((index * span) / wordCount);
    return { start, end: start + KINETIC_ENTER_FRAMES };
  });
}

/**
 * The style of word `index` (0-based) of `wordCount` at `frame` of a scene
 * `durationFrames` long. It fades from transparent and rises by one small space
 * token into place. A scene shorter than the registry minimum, or reduced
 * motion, draws every word in its place from the first frame (static).
 */
export function kineticWordStyle(
  index: number,
  wordCount: number,
  frame: number,
  durationFrames: number,
  tokens: ThemeTokens,
  reducedMotion = false,
): AnimationStyle {
  const slot = kineticSchedule(wordCount, durationFrames)[index];
  if (slot === undefined) {
    throw new RangeError(`word ${index} is not one of ${wordCount} words`);
  }
  const still = reducedMotion || durationFrames < preset.minFrames;
  const p = still ? 1 : easeOut((frame - slot.start) / KINETIC_ENTER_FRAMES);
  return {
    opacity: p,
    transform: `translateY(${css((1 - p) * tokens.space.sm)}px)`,
  };
}

/** The scene itself does not move under kinetic; its words do (kineticWordStyle). */
export const kinetic: AnimationFn = () => ({});
