// The source audio a kept `.video` block plays (task 044; ADR-0009). Pure: a
// scene frame in, a gain or a segment out, so a frame never depends on the one
// before it. The sound follows the picture: each segment is one pass over the
// source range, from sourceStart, placed where the picture starts that pass.
// Loop repeats the range; freeze and the end of the range leave silence. The
// rate is 1 (E_AUDIO_RATE), so source time and scene time advance together.
import type { IrMediaVideo } from "@quarto-video/ir";

/** One pass over the source range, in scene frames. */
export interface AudioSegment {
  /** The scene frame the pass starts on. */
  from: number;
  /** The scene frames the pass lasts (never past the scene's end). */
  frames: number;
  /** The source frame the pass starts from (`sourceStartFrames`). */
  trimBefore: number;
}

/** The overlaps of a scene's transitions, in scene frames (ADR-0009). */
export interface RampFrames {
  durationFrames: number;
  /** Frames of the overlap with the previous scene, at the start (0 for a cut). */
  incoming: number;
  /** Frames of the overlap with the next scene, at the end (0 for a cut). */
  outgoing: number;
}

/**
 * The passes of a kept clip over its scene. The source range is
 * [sourceStartFrames, sourceEndFrames), or from the start to the end of the file
 * when the end is unknown. Loop repeats the range until the scene ends; without
 * loop the range plays once, and a range shorter than the scene (freeze) is
 * followed by silence.
 */
export function audioSegmentsOf(
  media: IrMediaVideo,
  durationFrames: number,
): AudioSegment[] {
  if (media.playbackRate !== 1) {
    throw new Error(`kept audio of "${media.src}" needs playbackRate 1`);
  }
  const start = media.sourceStartFrames;
  if (media.sourceEndFrames === undefined) {
    return [{ from: 0, frames: durationFrames, trimBefore: start }];
  }
  const length = media.sourceEndFrames - start;
  if (!media.loop) {
    return [
      { from: 0, frames: Math.min(length, durationFrames), trimBefore: start },
    ];
  }
  const passes: AudioSegment[] = [];
  for (let from = 0; from < durationFrames; from += length) {
    passes.push({
      from,
      frames: Math.min(length, durationFrames - from),
      trimBefore: start,
    });
  }
  return passes;
}

/**
 * The gain of the kept sound at scene frame `frame`: `volume`, faded over each
 * transition overlap. The incoming overlap rises linearly from 1/L to 1 on its
 * last frame, the outgoing one falls linearly to 0 on the scene's last frame.
 */
export function gainAt(
  frame: number,
  volume: number,
  ramp: RampFrames,
): number {
  if (ramp.incoming > 0 && frame < ramp.incoming) {
    return (volume * (frame + 1)) / ramp.incoming;
  }
  const tail = ramp.durationFrames - ramp.outgoing;
  if (ramp.outgoing > 0 && frame >= tail) {
    return (volume * (ramp.durationFrames - frame - 1)) / ramp.outgoing;
  }
  return volume;
}
