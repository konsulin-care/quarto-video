// The resolved timeline (PRD §8.3; ADR-0005). A scene starts where the previous
// scene starts plus its length, minus the overlap of its own incoming
// transition. The total is the end of the last scene. Pure arithmetic on
// integer frames; the checks live in packages/validator (stage 4). The Lua
// filter implements the same rule (_extensions/video/lib/timeline.lua); the
// shared vectors in test-vectors/timeline.json drive both.
import type { IrVideo, IrTimeline } from "./types.js";

/** The fields of a scene that decide its place on the timeline. */
export interface TimedScene {
  id: string;
  durationFrames: number;
  transition?: { durationFrames: number };
}

/**
 * Start frames and total length. The first scene starts at 0 and its
 * transition, if any, is ignored (the validator rejects one that overlaps).
 */
export function resolveTimeline(scenes: readonly TimedScene[]): IrTimeline {
  const starts: IrTimeline["scenes"] = [];
  let start = 0;
  let previous: TimedScene | undefined;
  for (const scene of scenes) {
    if (previous !== undefined) {
      const overlap = scene.transition?.durationFrames ?? 0;
      start += previous.durationFrames - overlap;
    }
    starts.push({ id: scene.id, startFrame: start });
    previous = scene;
  }
  const last = previous?.durationFrames ?? 0;
  return { durationFrames: start + last, scenes: starts };
}

/**
 * The timeline of any supported manifest: the `timeline` section of IR 0.3,
 * or, for 0.1 and 0.2 (which have no transitions), the sequential timeline.
 */
export function timelineOf(ir: IrVideo): IrTimeline {
  if (ir.schemaVersion === "0.3") return ir.timeline;
  return resolveTimeline(ir.scenes);
}
