// fade-in (registry: animations/fade-in.json): the scene fades from transparent
// to opaque over its entrance window (the scene's animationDuration, or the
// default). Its minimum comes from the registry.
import preset from "@quarto-video/registry/animations/fade-in.json" with { type: "json" };
import { progress } from "./curve.js";
import type { AnimationFn } from "./types.js";

export const fadeIn: AnimationFn = (
  frame,
  durationFrames,
  _tokens,
  window,
) => ({
  opacity: progress(frame, durationFrames, preset.minFrames, undefined, window),
});
