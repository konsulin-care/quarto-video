// Layout arithmetic shared by the validator and the renderer (task 025): the
// safe-area margins of a frame, and the largest size in a theme's type scale
// at which text fits its box. Pure, with no node or browser APIs, so the
// renderer bundle imports it through "@quarto-video/registry/layout".
import type { ThemeTokens, TextFit } from "./types.js";

export interface Margins {
  x: number;
  y: number;
}

export interface Box {
  width: number;
  height: number;
}

export interface FitResult {
  /** The font size in px: the largest that fits, or the minimum when none does. */
  fontPx: number;
  /** Lines the text takes at fontPx (estimated). */
  lines: number;
  /** False when even the minimum size overflows the box. */
  fits: boolean;
}

/**
 * Average glyph advance as a share of the font size. A deliberate overestimate
 * for the bundled sans-serif, so a fitted text never runs past its box.
 */
export const GLYPH_EM = 0.6;

/** Pixel margins of a `width` x `height` frame, from the nearest declared ratio. */
export function safeAreaPixels(
  theme: ThemeTokens,
  width: number,
  height: number,
): Margins {
  const target = Math.log(width / height);
  let best: { xPercent: number; yPercent: number } | undefined;
  let bestDistance = Infinity;
  for (const [ratio, area] of Object.entries(theme.safeArea)) {
    const [w = 0, h = 0] = ratio.split(":").map(Number);
    const distance = Math.abs(Math.log(w / h) - target);
    if (distance < bestDistance) {
      best = area;
      bestDistance = distance;
    }
  }
  if (best === undefined) {
    throw new Error(`theme "${theme.id}" declares no safe area`);
  }
  return {
    x: Math.round((width * best.xPercent) / 100),
    y: Math.round((height * best.yPercent) / 100),
  };
}

/** The frame's area inside its safe-area margins. */
export function safeBox(
  theme: ThemeTokens,
  width: number,
  height: number,
): Box {
  const margin = safeAreaPixels(theme, width, height);
  return {
    width: width - 2 * margin.x,
    height: height - 2 * margin.y,
  };
}

/**
 * Lines `text` takes when a line holds `capacity` characters. Words wrap at
 * spaces; a word longer than a line breaks across lines. Each newline starts a
 * line.
 */
export function countLines(text: string, capacity: number): number {
  if (text === "") return 0;
  let total = 0;
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter((word) => word !== "");
    let lines = 1;
    let used = 0; // characters on the current line
    for (const word of words) {
      if (used > 0 && used + 1 + word.length <= capacity) {
        used += 1 + word.length;
        continue;
      }
      if (used > 0) lines += 1; // the word starts a new line
      if (word.length <= capacity) {
        used = word.length;
        continue;
      }
      // A word longer than a line fills rows of `capacity` characters.
      const rows = Math.ceil(word.length / capacity);
      lines += rows - 1;
      used = word.length - (rows - 1) * capacity;
    }
    total += lines;
  }
  return total;
}

/** Lines `text` takes in `width` px at `size` px. */
function linesAt(text: string, width: number, size: number): number {
  const capacity = Math.max(1, Math.floor(width / (GLYPH_EM * size)));
  return countLines(text, capacity);
}

/**
 * The largest integer size from `range.max` down to `range.min` (theme type
 * scale) at which `text` fits `box` at the theme's tight line height. When none
 * fits, `fontPx` is the minimum and `fits` is false: the renderer draws it and
 * the validator warns (W_TEXT_FIT).
 */
export function fitText(
  text: string,
  box: Box,
  theme: ThemeTokens,
  range: TextFit,
): FitResult {
  const { scale, lineHeight } = theme.typography;
  const max = scale[range.max];
  const min = scale[range.min];
  for (let size = max; size >= min; size -= 1) {
    const lines = linesAt(text, box.width, size);
    if (lines * size * lineHeight.tight <= box.height) {
      return { fontPx: size, lines, fits: true };
    }
  }
  return { fontPx: min, lines: linesAt(text, box.width, min), fits: false };
}
