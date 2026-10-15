// Pixel comparison with tolerance (PRD §13.3). A pixel differs when any channel
// moves by more than `channelTolerance`; a frame passes when the share of
// differing pixels is at most `maxDiffRatio`. The diff image shows differing
// pixels in red and everything else dimmed, so the change stands out.
import type { Rgb } from "./png.js";

export interface Tolerance {
  channelTolerance: number;
  maxDiffRatio: number;
}

export interface Comparison {
  pixels: number;
  differing: number;
  /** differing / pixels, 0 when the image is empty. */
  ratio: number;
  /** Largest channel difference seen, differing or not. */
  maxDelta: number;
  passed: boolean;
  /** Same size as the inputs; red where pixels differ, dimmed actual elsewhere. */
  diff: Rgb;
}

const DIFF_RED = [255, 0, 0];
const DIM_FACTOR = 0.25;

/** Compares two same-sized images. Sizes must match; the caller checks first. */
export function compareImages(
  reference: Rgb,
  actual: Rgb,
  tolerance: Tolerance,
): Comparison {
  if (reference.width !== actual.width || reference.height !== actual.height) {
    throw new Error("compareImages needs images of the same size");
  }
  const pixels = reference.width * reference.height;
  const diff = Buffer.alloc(reference.data.length);
  let differing = 0;
  let maxDelta = 0;
  for (let p = 0; p < pixels; p++) {
    const i = p * 3;
    let delta = 0;
    for (let c = 0; c < 3; c++) {
      const d = Math.abs(
        (actual.data[i + c] ?? 0) - (reference.data[i + c] ?? 0),
      );
      if (d > delta) delta = d;
    }
    if (delta > maxDelta) maxDelta = delta;
    const isDiff = delta > tolerance.channelTolerance;
    if (isDiff) differing++;
    for (let c = 0; c < 3; c++) {
      diff[i + c] = isDiff
        ? (DIFF_RED[c] ?? 0)
        : Math.round((actual.data[i + c] ?? 0) * DIM_FACTOR);
    }
  }
  const ratio = pixels === 0 ? 0 : differing / pixels;
  return {
    pixels,
    differing,
    ratio,
    maxDelta,
    passed: ratio <= tolerance.maxDiffRatio,
    diff: { width: reference.width, height: reference.height, data: diff },
  };
}
