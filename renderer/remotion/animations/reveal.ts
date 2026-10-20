// reveal (registry: animations/reveal.json): the scene fades in while it grows
// from 96% to its full size over its entrance. Nothing is clipped or masked, so
// no glyph is ever cut through (task 021 deviation, resolved in the redesign).
// The entrance eases out like fade-in and slide-up; its minimum comes from the registry.
import preset from "@quarto-video/registry/animations/reveal.json" with { type: "json" };
import { css, progress } from "./curve.js";
import type { AnimationFn } from "./types.js";

/** The scale the entrance starts from: 96% of full size. */
export const REVEAL_START_SCALE = 0.96;

export const reveal: AnimationFn = (frame, durationFrames, _tokens, window) => {
  const p = progress(
    frame,
    durationFrames,
    preset.minFrames,
    undefined,
    window,
  );
  const scale = 1 - (1 - p) * (1 - REVEAL_START_SCALE);
  return { opacity: p, transform: `scale(${css(scale)})` };
};
