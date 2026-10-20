// Animation preset ids -> frame functions (PRD §5.6). The ids are the registry's
// (packages/registry/animations); the renderer's parity test keeps them equal.
// Entrances (scene attribute animation) and exits (scene attribute exit, ADR-0020)
// are kept apart: ANIMATIONS and EXITS, each keyed by the preset's id.
// Reduced motion (task 023): each preset's registry rule says what it draws
// instead; this file reads the rules, so the registry stays the one source.
import type { ThemeTokens } from "@quarto-video/registry";
import { kineticFallsBack } from "@quarto-video/registry/kinetic";
import countUpPreset from "@quarto-video/registry/animations/count-up.json" with { type: "json" };
import fadeInPreset from "@quarto-video/registry/animations/fade-in.json" with { type: "json" };
import fadeOutPreset from "@quarto-video/registry/animations/fade-out.json" with { type: "json" };
import kineticPreset from "@quarto-video/registry/animations/kinetic.json" with { type: "json" };
import revealPreset from "@quarto-video/registry/animations/reveal.json" with { type: "json" };
import slideUpPreset from "@quarto-video/registry/animations/slide-up.json" with { type: "json" };
import staggerPreset from "@quarto-video/registry/animations/stagger.json" with { type: "json" };
import { countUp } from "./count-up.js";
import { fadeIn } from "./fade-in.js";
import { fadeOut } from "./fade-out.js";
import { kinetic } from "./kinetic.js";
import { reveal } from "./reveal.js";
import { slideUp } from "./slide-up.js";
import { stagger } from "./stagger.js";
import type { AnimationFn, AnimationStyle } from "./types.js";

export type { AnimationFn, AnimationStyle } from "./types.js";

export const ANIMATIONS: Readonly<Record<string, AnimationFn>> = {
  "count-up": countUp,
  "fade-in": fadeIn,
  kinetic,
  reveal,
  "slide-up": slideUp,
  stagger,
};

/** The exit presets this renderer draws (ADR-0020), keyed by id. */
export const EXITS: Readonly<Record<string, AnimationFn>> = {
  "fade-out": fadeOut,
};

/** The entrance preset ids this renderer draws, sorted. */
export function animationIds(): string[] {
  return Object.keys(ANIMATIONS).sort();
}

/** The exit preset ids this renderer draws, sorted. */
export function exitIds(): string[] {
  return Object.keys(EXITS).sort();
}

/** The reduced-motion rule of each preset, from its registry contract. */
const REDUCED_MOTION: Readonly<Record<string, string>> = {
  "count-up": countUpPreset.reducedMotion,
  "fade-in": fadeInPreset.reducedMotion,
  "fade-out": fadeOutPreset.reducedMotion,
  kinetic: kineticPreset.reducedMotion,
  reveal: revealPreset.reducedMotion,
  "slide-up": slideUpPreset.reducedMotion,
  stagger: staggerPreset.reducedMotion,
};

/**
 * The style of preset `name` at `frame`. An unknown name is an Error: the
 * validator rejects it before any render starts (ADR-0011). With
 * `reducedMotion`, the preset's registry rule applies: "static" draws the end
 * state from the first frame. Frame `durationFrames` lies past every entrance
 * (curve.ts: an entrance is at most a third of the scene, or its window), so it
 * is that end state. `windowFrames` is the scene's animationDuration (ADR-0020).
 */
export function animationStyle(
  name: string,
  frame: number,
  durationFrames: number,
  tokens: ThemeTokens,
  reducedMotion = false,
  windowFrames?: number,
): AnimationStyle {
  const preset = ANIMATIONS[name];
  if (preset === undefined) {
    throw new Error(
      `unknown animation "${name}" (known: ${animationIds().join(", ")})`,
    );
  }
  if (!reducedMotion)
    return preset(frame, durationFrames, tokens, windowFrames);
  const rule = REDUCED_MOTION[name];
  if (rule !== "static") {
    throw new Error(`animation "${name}" has no reduced-motion rule "${rule}"`);
  }
  return preset(durationFrames, durationFrames, tokens, windowFrames);
}

/**
 * The style of exit preset `name` at `frame` (ADR-0020). An unknown name is an
 * Error, as for animationStyle. Reduced motion draws the scene as it is: the
 * "static" rule of fade-out is no fade at all, so the style is empty. A scene
 * shorter than the preset's minFrames is drawn as it is too (curve.ts).
 */
export function exitStyle(
  name: string,
  frame: number,
  durationFrames: number,
  tokens: ThemeTokens,
  reducedMotion = false,
  windowFrames?: number,
): AnimationStyle {
  const preset = EXITS[name];
  if (preset === undefined) {
    throw new Error(`unknown exit "${name}" (known: ${exitIds().join(", ")})`);
  }
  if (!reducedMotion)
    return preset(frame, durationFrames, tokens, windowFrames);
  const rule = REDUCED_MOTION[name];
  if (rule !== "static") {
    throw new Error(`exit "${name}" has no reduced-motion rule "${rule}"`);
  }
  return {};
}

/**
 * The two styles drawn together on one scene: opacities multiply, and the other
 * properties are the exit's when it sets them, else the entrance's.
 */
export function combineStyles(
  entrance: AnimationStyle,
  exit: AnimationStyle,
): AnimationStyle {
  const style: AnimationStyle = { ...entrance, ...exit };
  if (entrance.opacity !== undefined && exit.opacity !== undefined) {
    style.opacity = entrance.opacity * exit.opacity;
  }
  return style;
}

/**
 * The animation a scene draws. A kinetic statement with more words than
 * KINETIC_MAX_WORDS is drawn with fade-in instead (task 026; the validator warns
 * W_ANIMATION_FALLBACK). Every other name is drawn as it is.
 */
export function effectiveAnimation(
  name: string | undefined,
  statementText: string,
): string | undefined {
  return name === "kinetic" && kineticFallsBack(statementText)
    ? "fade-in"
    : name;
}
