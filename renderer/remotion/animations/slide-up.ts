// slide-up (registry: animations/slide-up.json): the scene fades in while it
// rises by one large space token into place. Its minimum comes from the registry.
import preset from "@quarto-video/registry/animations/slide-up.json" with { type: "json" };
import { css, progress } from "./curve.js";
import type { AnimationFn } from "./types.js";

export const slideUp: AnimationFn = (frame, durationFrames, tokens, window) => {
  const p = progress(
    frame,
    durationFrames,
    preset.minFrames,
    undefined,
    window,
  );
  return {
    opacity: p,
    transform: `translateY(${css((1 - p) * tokens.space.lg)}px)`,
  };
};
