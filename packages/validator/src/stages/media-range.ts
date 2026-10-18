// Stage 3 range check for one `.video` block (task 038; PRD §6.2, §6.3, §8.3;
// ADR-0008). Pure: the probed duration comes in as a number, so no file is read
// here. A source range that runs past the file is E_MEDIA_RANGE. Footage shorter
// than the scene needs is E_MEDIA_SHORT_SOURCE unless the block says loop or
// freeze. Footage is never stretched or sped up to fit (AGENT.md).
import type { AssetProblem } from "../assets/syntax.js";

/** A `.video` block's range, from the IR, with its scene's timing. */
export interface VideoRange {
  /** Project-relative source path, as written in the block's src. */
  path: string;
  /** Project frame rate: source frames are counted at this rate. */
  fps: number;
  /** The scene's duration in frames (timeline time). */
  durationFrames: number;
  sourceStartFrames: number;
  sourceEndFrames?: number;
  loop: boolean;
  freeze: boolean;
  playbackRate: number;
}

const seconds = (frames: number, fps: number): string =>
  (frames / fps).toFixed(2);

/**
 * The first range problem of one block, given the probed duration of its file
 * in seconds, or null when the range is valid. Source frames are rounded to
 * the nearest whole frame of the probed duration.
 */
export function videoRangeProblem(
  range: VideoRange,
  sourceSeconds: number,
): AssetProblem | null {
  const { path, fps } = range;
  const available = Math.round(sourceSeconds * fps);
  const base = { ok: false as const, assetPath: path };
  if (
    range.sourceEndFrames !== undefined &&
    range.sourceEndFrames > available
  ) {
    return {
      ...base,
      code: "E_MEDIA_RANGE",
      message: `sourceEnd exceeds the source duration of "${path}".`,
      suggestion: `Set sourceEnd to at most ${seconds(available, fps)}s, the length of the file.`,
    };
  }
  if (range.sourceStartFrames >= available) {
    return {
      ...base,
      code: "E_MEDIA_RANGE",
      message: `sourceStart is at or after the source duration of "${path}".`,
      suggestion: `Set sourceStart to less than ${seconds(available, fps)}s, the length of the file.`,
    };
  }
  const segment =
    (range.sourceEndFrames ?? available) - range.sourceStartFrames;
  const needed = range.durationFrames * range.playbackRate;
  if (segment < needed && !range.loop && !range.freeze) {
    return {
      ...base,
      code: "E_MEDIA_SHORT_SOURCE",
      message: `The source range of "${path}" is ${seconds(segment, fps)}s, but the scene needs ${seconds(needed, fps)}s of it.`,
      suggestion:
        'Add loop="true" to repeat the footage or freeze="true" to hold its last frame, or shorten the scene.',
    };
  }
  return null;
}
