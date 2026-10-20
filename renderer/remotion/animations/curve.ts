// Shared timing of the animation presets (task 021). The entrance runs over
// the first third of the scene, at most MAX_ENTER_FRAMES, unless the scene sets
// its window (animationDuration, ADR-0020). The exit (fade-out) runs over the
// last window of the scene, which has the same default length. A scene shorter
// than the preset's minFrames shows the end state from its first frame (the
// preset's shortScene rule). Pure: a function of frame, length, minimum and window.

/** Longest entrance in frames: one second at 30 fps. */
export const MAX_ENTER_FRAMES = 30;

/** Frames the entrance takes in a scene of `durationFrames` (at least 1). */
export function enterFrames(durationFrames: number): number {
  return Math.min(
    MAX_ENTER_FRAMES,
    Math.max(1, Math.round(durationFrames / 3)),
  );
}

/**
 * Frames of an entrance or exit window: the scene's animationDuration when it
 * sets one (`window`, ADR-0020), else the default entrance length.
 */
export function windowFrames(durationFrames: number, window?: number): number {
  return window ?? enterFrames(durationFrames);
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
  window?: number,
): number {
  if (durationFrames < minFrames) return 1;
  return ease(frame / windowFrames(durationFrames, window));
}

/**
 * Exit opacity in [0, 1] (fade-out): 1 before the exit window, falling to 0 on
 * the scene's last frame. The window is the last `windowFrames` frames: its
 * first frame is fully opaque, and the fade is the entrance curve reversed in
 * time. Below `minFrames` the opacity is 1 at every frame (the scene as it is).
 */
export function exitOpacity(
  frame: number,
  durationFrames: number,
  minFrames: number,
  window?: number,
): number {
  if (durationFrames < minFrames) return 1;
  const span = Math.max(1, windowFrames(durationFrames, window) - 1);
  return easeOut((durationFrames - 1 - frame) / span);
}

/** A number rounded to two decimals, for CSS values. */
export function css(value: number): string {
  return String(Math.round(value * 100) / 100);
}
