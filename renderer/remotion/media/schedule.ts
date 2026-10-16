// The source frame a background clip shows at each scene frame (task 039; PRD
// §6.1, §6.2). Pure: a scene frame in, a source frame out, so a frame never
// depends on the frames before it. Footage is never stretched: `playbackRate`
// is the speed the author asked for, and loop and freeze keep that speed.
// Validation keeps footage from running short without loop or freeze.
import type { IrMediaVideo } from "@quarto-video/ir";

/** A clip's source range and speed, in source frames at the project fps. */
export interface SourcePlan {
  /** The first source frame played (`sourceStart`). */
  start: number;
  /** The source frame after the last one played (`sourceEnd`); infinite when unknown. */
  end: number;
  /** Source frames per scene frame (`playbackRate`). */
  rate: number;
  loop: boolean;
  freeze: boolean;
}

/** The plan of one `.video` block. Loop and freeze need the end, which the validator writes (stage 3). */
export function planOf(media: IrMediaVideo): SourcePlan {
  if (media.sourceEndFrames === undefined && (media.loop || media.freeze)) {
    throw new Error(`footage "${media.src}" has no resolved source end`);
  }
  return {
    start: media.sourceStartFrames,
    end: media.sourceEndFrames ?? Number.POSITIVE_INFINITY,
    rate: media.playbackRate,
    loop: media.loop,
    freeze: media.freeze,
  };
}

/**
 * The source frame shown at scene frame `frame`: start + frame × rate. With
 * loop the source range repeats; with freeze the last frame of the range is
 * held once the footage has run out.
 */
export function sourceFrameAt(frame: number, plan: SourcePlan): number {
  const offset = Math.floor(frame * plan.rate + 1e-9);
  const length = plan.end - plan.start;
  if (plan.loop) return plan.start + (offset % length);
  return plan.start + Math.min(offset, length - 1);
}
