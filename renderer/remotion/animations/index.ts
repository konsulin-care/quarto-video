// Animation preset ids -> frame functions (PRD §5.6). The ids are the registry's
// (packages/registry/animations); the renderer's parity test keeps them equal.
import type { ThemeTokens } from "@quarto-video/registry";
import { fadeIn } from "./fade-in.js";
import { reveal } from "./reveal.js";
import { slideUp } from "./slide-up.js";
import type { AnimationFn, AnimationStyle } from "./types.js";

export type { AnimationFn, AnimationStyle } from "./types.js";

export const ANIMATIONS: Readonly<Record<string, AnimationFn>> = {
  "fade-in": fadeIn,
  reveal,
  "slide-up": slideUp,
};

/** The preset ids this renderer draws, sorted. */
export function animationIds(): string[] {
  return Object.keys(ANIMATIONS).sort();
}

/**
 * The style of preset `name` at `frame`. An unknown name is an Error: the
 * validator rejects it before any render starts (ADR-0011).
 */
export function animationStyle(
  name: string,
  frame: number,
  durationFrames: number,
  tokens: ThemeTokens,
): AnimationStyle {
  const preset = ANIMATIONS[name];
  if (preset === undefined) {
    throw new Error(
      `unknown animation "${name}" (known: ${animationIds().join(", ")})`,
    );
  }
  return preset(frame, durationFrames, tokens);
}
