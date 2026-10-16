// stagger (registry: animations/stagger.json; task 028): the items of a list
// (bullets, end-card credits) appear one after another, each fading in while it
// rises into place. The schedule is a pure function of the item count and the
// scene's length. Item i starts at floor(i * span / count) frames, with
// span = settle - ENTER and settle = ceil(0.7 * durationFrames), so every item
// is in place by `settle`. The scene itself does not move: the list styles each
// item (stagger-motion.ts). Its minimum comes from the registry.
import type { ThemeTokens } from "@quarto-video/registry";
import preset from "@quarto-video/registry/animations/stagger.json" with { type: "json" };
import { css, easeOut } from "./curve.js";
import type { AnimationFn, AnimationStyle } from "./types.js";

/** Frames one item takes to appear: 0.3 s at 30 fps. */
export const STAGGER_ENTER_FRAMES = 9;

/** The share of the scene by which every item is in place. */
export const STAGGER_SETTLE_SHARE = 0.7;

/** When item i fades in: its first and its last entrance frame's start. */
export interface ItemSlot {
  start: number;
  end: number;
}

/** The frame by which every item is in place: ceil(0.7 * durationFrames). */
export function staggerSettleFrame(durationFrames: number): number {
  return Math.ceil(STAGGER_SETTLE_SHARE * durationFrames);
}

/** Where each of `count` items starts and ends its entrance in a scene of `durationFrames`. */
export function staggerSchedule(
  count: number,
  durationFrames: number,
): ItemSlot[] {
  const span = Math.max(
    0,
    staggerSettleFrame(durationFrames) - STAGGER_ENTER_FRAMES,
  );
  return Array.from({ length: count }, (_, index) => {
    const start = Math.floor((index * span) / count);
    return { start, end: start + STAGGER_ENTER_FRAMES };
  });
}

/**
 * The style of item `index` (0-based) of `count` at `frame` of a scene
 * `durationFrames` long. It fades from transparent and rises by one `space.sm`
 * token into place. A scene shorter than the registry minimum, or reduced
 * motion, draws every item in its place from the first frame (static), so
 * reduced motion shows the whole list at once.
 */
export function staggerItemStyle(
  index: number,
  count: number,
  frame: number,
  durationFrames: number,
  tokens: ThemeTokens,
  reducedMotion = false,
): AnimationStyle {
  const slot = staggerSchedule(count, durationFrames)[index];
  if (slot === undefined) {
    throw new RangeError(`item ${index} is not one of ${count} items`);
  }
  const still = reducedMotion || durationFrames < preset.minFrames;
  const p = still ? 1 : easeOut((frame - slot.start) / STAGGER_ENTER_FRAMES);
  return {
    opacity: p,
    transform: `translateY(${css((1 - p) * tokens.space.sm)}px)`,
  };
}

/** The scene itself does not move under stagger; its items do (staggerItemStyle). */
export const stagger: AnimationFn = () => ({});
