// Transition names -> frame functions (PRD §5.6; ADR-0005). The names are the
// registry's (packages/registry/transitions); the renderer's parity test keeps
// them equal. The overlap of a boundary is the incoming scene's transition
// duration: the incoming scene's first frames and the outgoing scene's last.
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
 * first overlap frame the same way, so both end on the same frame.
 */
export function transitionStyle(
  frame: number,
  durationFrames: number,
  incoming?: Overlap,
  outgoing?: Overlap,
): TransitionStyle | undefined {
  if (incoming !== undefined && incoming.overlapFrames > 0) {
    if (frame < incoming.overlapFrames) {
      return presetOf(incoming.name).incoming(
        (frame + 1) / incoming.overlapFrames,
      );
    }
  }
  if (outgoing !== undefined && outgoing.overlapFrames > 0) {
    const first = durationFrames - outgoing.overlapFrames;
    if (frame >= first) {
      return presetOf(outgoing.name).outgoing(
        (frame - first + 1) / outgoing.overlapFrames,
      );
    }
  }
  return undefined;
}
