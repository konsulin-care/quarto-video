// Shared timing of the animation presets (task 021). The entrance runs over
// the first third of the scene, at most MAX_ENTER_FRAMES. A scene shorter than
// the preset's minFrames shows the end state from its first frame (the
// preset's shortScene rule). Pure: a function of frame, length and minimum.

/** Longest entrance in frames: one second at 30 fps. */
export const MAX_ENTER_FRAMES = 30;

/** Frames the entrance takes in a scene of `durationFrames` (at least 1). */
export function enterFrames(durationFrames: number): number {
  return Math.min(
    MAX_ENTER_FRAMES,
    Math.max(1, Math.round(durationFrames / 3)),
  );
}

/** Ease-out cubic of `t`, with `t` clamped to [0, 1]. */
export function easeOut(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - (1 - clamped) ** 3;
}

/**
 * Entrance progress in [0, 1]: 0 at the first frame, 1 from the end of the
 * entrance on, shaped by `ease` (ease-out cubic by default). Below `minFrames`
 * the progress is 1 at every frame.
 */
export function progress(
  frame: number,
  durationFrames: number,
  minFrames: number,
  ease: (t: number) => number = easeOut,
): number {
  if (durationFrames < minFrames) return 1;
  return ease(frame / enterFrames(durationFrames));
}

/** A number rounded to two decimals, for CSS values. */
export function css(value: number): string {
  return String(Math.round(value * 100) / 100);
}
