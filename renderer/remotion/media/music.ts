// The project music track (task 045; ADR-0017). Pure: a frame in, a gain or a
// pass out, so a frame never depends on the one before it. The file plays from
// its first sample at timeline frame 0. With loop it repeats back to back, each
// pass lengthFrames long (the validator writes that length from the probed file),
// and the last pass is cut at the timeline's end. Without loop it plays once.
// The fade-out is linear over the last N frames and reaches silence on the last one.
import type { IrMusic } from "@quarto-video/ir";

/** One pass of the file, in timeline frames. */
export interface MusicPass {
  /** The timeline frame the pass starts on. */
  from: number;
  /** The timeline frames the pass lasts (never past the timeline's end). */
  frames: number;
}

/** The passes of the track over a timeline of `totalFrames` frames. */
export function musicPassesOf(
  music: IrMusic,
  totalFrames: number,
): MusicPass[] {
  const period = music.lengthFrames;
  if (period === undefined) {
    throw new Error(
      "music has no lengthFrames; the validator writes it (ADR-0017)",
    );
  }
  if (!music.loop) {
    return [{ from: 0, frames: Math.min(period, totalFrames) }];
  }
  const passes: MusicPass[] = [];
  for (let from = 0; from < totalFrames; from += period) {
    passes.push({ from, frames: Math.min(period, totalFrames - from) });
  }
  return passes;
}

/**
 * The gain of the track at timeline frame `frame`: `volume`, and in the last
 * `fadeOutFrames` frames of the timeline `volume x (T-f-1)/N`, which falls
 * linearly and is 0 on the last frame.
 */
export function musicGainAt(
  frame: number,
  music: IrMusic,
  totalFrames: number,
): number {
  const fade = music.fadeOutFrames ?? 0;
  if (fade > 0 && frame >= totalFrames - fade) {
    return (music.volume * (totalFrames - frame - 1)) / fade;
  }
  return music.volume;
}
