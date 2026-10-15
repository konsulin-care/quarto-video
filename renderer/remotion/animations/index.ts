// Animation preset ids -> frame functions (PRD §5.6). The ids are the registry's
// (packages/registry/animations); the renderer's parity test keeps them equal.
// Reduced motion (task 023): each preset's registry rule says what it draws
// instead; this file reads the rules, so the registry stays the one source.
import type { ThemeTokens } from "@quarto-video/registry";
import fadeInPreset from "@quarto-video/registry/animations/fade-in.json" with { type: "json" };
import revealPreset from "@quarto-video/registry/animations/reveal.json" with { type: "json" };
import slideUpPreset from "@quarto-video/registry/animations/slide-up.json" with { type: "json" };
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

/** The reduced-motion rule of each preset, from its registry contract. */
const REDUCED_MOTION: Readonly<Record<string, string>> = {
  "fade-in": fadeInPreset.reducedMotion,
  reveal: revealPreset.reducedMotion,
  "slide-up": slideUpPreset.reducedMotion,
};

/**
 * The style of preset `name` at `frame`. An unknown name is an Error: the
 * validator rejects it before any render starts (ADR-0011). With
 * `reducedMotion`, the preset's registry rule applies: "static" draws the end
 * state from the first frame. Frame `durationFrames` lies past every entrance
 * (curve.ts: an entrance is at most a third of the scene), so it is that end state.
 */
export function animationStyle(
  name: string,
  frame: number,
  durationFrames: number,
  tokens: ThemeTokens,
  reducedMotion = false,
): AnimationStyle {
  const preset = ANIMATIONS[name];
  if (preset === undefined) {
    throw new Error(
      `unknown animation "${name}" (known: ${animationIds().join(", ")})`,
    );
  }
  if (!reducedMotion) return preset(frame, durationFrames, tokens);
  const rule = REDUCED_MOTION[name];
  if (rule !== "static") {
    throw new Error(`animation "${name}" has no reduced-motion rule "${rule}"`);
  }
  return preset(durationFrames, durationFrames, tokens);
}
