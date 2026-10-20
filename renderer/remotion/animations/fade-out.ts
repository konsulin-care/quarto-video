// fade-out (registry: animations/fade-out.json, role exit): the scene fades from
// opaque to transparent over its last window (ADR-0020). Its minimum comes from
// the registry; reduced motion and short scenes draw the scene as it is (index.ts).
import preset from "@quarto-video/registry/animations/fade-out.json" with { type: "json" };
import { exitOpacity } from "./curve.js";
import type { AnimationFn } from "./types.js";

export const fadeOut: AnimationFn = (
  frame,
  durationFrames,
  _tokens,
  window,
) => ({
  opacity: exitOpacity(frame, durationFrames, preset.minFrames, window),
});
