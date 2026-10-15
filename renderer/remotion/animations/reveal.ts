// reveal (registry: animations/reveal.json): a wipe uncovers the scene from
// left to right at constant speed over its entrance. The scene is fully
// uncovered at the end, so nothing stays clipped. Its minimum comes from the registry.
import preset from "@quarto-video/registry/animations/reveal.json" with { type: "json" };
import { css, linear, progress } from "./curve.js";
import type { AnimationFn } from "./types.js";

export const reveal: AnimationFn = (frame, durationFrames) => {
  const shown = progress(frame, durationFrames, preset.minFrames, linear);
  const hidden = (1 - shown) * 100;
  return { clipPath: `inset(0 ${css(hidden)}% 0 0)` };
};
