// Transition names -> frame functions (PRD §5.6; ADR-0005). The names are the
// registry's (packages/registry/transitions); the renderer's parity test keeps
// them equal. The overlap of a boundary is the incoming scene's transition
// duration: the incoming scene's first frames and the outgoing scene's last.
import cutPreset from "@quarto-video/registry/transitions/cut.json" with { type: "json" };
import fadePreset from "@quarto-video/registry/transitions/fade.json" with { type: "json" };
import slidePreset from "@quarto-video/registry/transitions/slide.json" with { type: "json" };
import wipePreset from "@quarto-video/registry/transitions/wipe.json" with { type: "json" };
import zoomPreset from "@quarto-video/registry/transitions/zoom.json" with { type: "json" };
import { cut } from "./cut.js";
import { fade } from "./fade.js";
import { slide } from "./slide.js";
import { wipe } from "./wipe.js";
import { zoom } from "./zoom.js";
import type { TransitionPreset, TransitionStyle } from "./types.js";

export type {
  TransitionPreset,
  TransitionSide,
  TransitionStyle,
} from "./types.js";

export const TRANSITIONS: Readonly<Record<string, TransitionPreset>> = {
  cut,
  fade,
  slide,
  wipe,
  zoom,
};

/** The transition names this renderer draws, sorted. */
export function transitionIds(): string[] {
  return Object.keys(TRANSITIONS).sort();
}

/**
 * Reduced motion (task 023): the name each transition draws instead, from its
 * registry rule. The overlap in frames is unchanged, so timing does not move.
 */
const REDUCED_MOTION: Readonly<Record<string, string>> = {
  cut: cutPreset.reducedMotion,
  fade: fadePreset.reducedMotion,
  slide: slidePreset.reducedMotion,
  wipe: wipePreset.reducedMotion,
  zoom: zoomPreset.reducedMotion,
};

/** One boundary's transition: its name and its overlap in frames. */
export interface Overlap {
  name: string;
  overlapFrames: number;
}

function presetOf(name: string): TransitionPreset {
  const preset = TRANSITIONS[name];
  if (preset === undefined) {
    throw new Error(
      `unknown transition "${name}" (known: ${transitionIds().join(", ")})`,
    );
  }
  return preset;
}

/**
 * The style of a scene's layer at `frame` (0-based, from the scene's first
 * frame), or undefined when no transition applies there. `incoming` covers the
 * scene's first frames, `outgoing` its last `overlapFrames`. Progress for the
 * incoming side is (frame + 1) / overlap; the outgoing side counts from its
 * first overlap frame the same way, so both end on the same frame. With
 * `reducedMotion`, each side draws its preset's reduced-motion name instead.
 */
export function transitionStyle(
  frame: number,
  durationFrames: number,
  incoming?: Overlap,
  outgoing?: Overlap,
  reducedMotion = false,
): TransitionStyle | undefined {
  const named = (name: string): string =>
    reducedMotion ? (REDUCED_MOTION[name] ?? name) : name;
  if (incoming !== undefined && incoming.overlapFrames > 0) {
    if (frame < incoming.overlapFrames) {
      return presetOf(named(incoming.name)).incoming(
        (frame + 1) / incoming.overlapFrames,
      );
    }
  }
  if (outgoing !== undefined && outgoing.overlapFrames > 0) {
    const first = durationFrames - outgoing.overlapFrames;
    if (frame >= first) {
      return presetOf(named(outgoing.name)).outgoing(
        (frame - first + 1) / outgoing.overlapFrames,
      );
    }
  }
  return undefined;
}
