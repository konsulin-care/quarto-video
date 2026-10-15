// Flash-rate check (PRD §12; task 023). A flash is a change of full-frame
// luminance larger than FLASH_THRESHOLD between two consecutive frames (the
// general flash limit of WCAG 2.3.1, applied to the whole frame). No one-second
// window may hold more than MAX_FLASHES_PER_SECOND flashes. Pure: the caller
// supplies the frames' luminance.
import type { Rgb } from "./png.js";

/** Largest luminance change between consecutive frames that is not a flash (10% of full scale). */
export const FLASH_THRESHOLD = 0.1;

/** Most flashes allowed in any one-second window. */
export const MAX_FLASHES_PER_SECOND = 3;

/** Mean luminance of a frame in [0, 1]: Rec. 709 weights on the sRGB values. */
export function fullFrameLuma(image: Rgb): number {
  const { data } = image;
  const pixels = data.length / 3;
  let sum = 0;
  for (let i = 0; i < data.length; i += 3) {
    sum += 0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!;
  }
  return sum / pixels / 255;
}

/** Indices of the frames whose luminance differs from the previous frame by more than `threshold`. */
export function flashFrames(
  lumas: readonly number[],
  threshold = FLASH_THRESHOLD,
): number[] {
  const flashes: number[] = [];
  for (let i = 1; i < lumas.length; i += 1) {
    if (Math.abs(lumas[i]! - lumas[i - 1]!) > threshold) flashes.push(i);
  }
  return flashes;
}

/** The most flashes in any window of `fps` consecutive frames (one second). */
export function maxFlashesPerSecond(
  lumas: readonly number[],
  fps: number,
  threshold = FLASH_THRESHOLD,
): number {
  const flashes = flashFrames(lumas, threshold);
  let most = 0;
  let start = 0;
  for (let end = 0; end < flashes.length; end += 1) {
    while (flashes[end]! - flashes[start]! >= fps) start += 1;
    most = Math.max(most, end - start + 1);
  }
  return most;
}
