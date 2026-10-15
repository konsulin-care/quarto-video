// The renderer's side of an animation preset (PRD §5.6; task 021). A preset is
// a pure function of the frame: the same inputs always give the same style.
import type { ThemeTokens } from "@quarto-video/registry";

/** The style a preset draws at one frame. Applied to the whole scene. */
export interface AnimationStyle {
  opacity?: number;
  transform?: string;
  clipPath?: string;
}

/**
 * Preset API: the style at `frame` (0-based, from the scene's first frame) of a
 * scene `durationFrames` long, drawn with `tokens`. Never reads the clock,
 * randomness or browser state (PRD §8.4, §11.1).
 */
export type AnimationFn = (
  frame: number,
  durationFrames: number,
  tokens: ThemeTokens,
) => AnimationStyle;
