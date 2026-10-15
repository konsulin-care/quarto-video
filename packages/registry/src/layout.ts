// Layout arithmetic shared by the validator and the renderer (task 025): the
// safe-area margins of a frame, and the largest size in a theme's type scale
// at which text fits its box. Pure, with no node or browser APIs, so the
// renderer bundle imports it through "@quarto-video/registry/layout".
import type { TextFit, TextRange, ThemeTokens } from "./types.js";

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
 * scale) at which `text` fits `box` at `lineHeight` (default: the theme's tight
 * line height). When none fits, `fontPx` is the minimum and `fits` is false: the
 * renderer draws it and the validator warns (W_TEXT_FIT).
 */
export function fitText(
  text: string,
  box: Box,
  theme: ThemeTokens,
  range: TextRange,
  lineHeight: number = theme.typography.lineHeight.tight,
): FitResult {
  const { scale } = theme.typography;
  const max = scale[range.max];
  const min = scale[range.min];
  for (let size = max; size >= min; size -= 1) {
    const lines = linesAt(text, box.width, size);
    if (lines * size * lineHeight <= box.height) {
      return { fontPx: size, lines, fits: true };
    }
  }
  return { fontPx: min, lines: linesAt(text, box.width, min), fits: false };
}

/** The fit of a title (`default`) and, when it has text, its `subtitle`. */
export interface StackFit {
  default: FitResult;
  subtitle?: FitResult;
}

/**
 * Fits a title and its optional subtitle as one centred column in `box` (task
 * 026). The title keeps the largest size in its range at which the column fits:
 * for each title size, from the largest down, the subtitle takes the largest
 * size in its range that fits the height the title leaves, at the body line
 * height the renderer draws it with, plus the theme's `sm` space. Without
 * subtitle text, or without a subtitle range, the title is fitted alone.
 *
 * When no pair fits, the title stays at the minimum and the result says what
 * does not fit: the title when it overflows alone, otherwise the subtitle.
 */
export function fitStack(
  slots: { default: string; subtitle: string },
  box: Box,
  theme: ThemeTokens,
  range: TextFit,
): StackFit {
  if (range.subtitle === undefined || slots.subtitle === "") {
    return { default: fitText(slots.default, box, theme, range) };
  }
  const subRange = range.subtitle;
  const { tight, body } = theme.typography.lineHeight;
  const { scale } = theme.typography;
  const gap = theme.space.sm;
  for (let size = scale[range.max]; size >= scale[range.min]; size -= 1) {
    const lines = linesAt(slots.default, box.width, size);
    const rest = {
      width: box.width,
      height: box.height - lines * size * tight - gap,
    };
    const subtitle = fitText(slots.subtitle, rest, theme, subRange, body);
    if (subtitle.fits) {
      return { default: { fontPx: size, lines, fits: true }, subtitle };
    }
  }
  const min = scale[range.min];
  const lines = linesAt(slots.default, box.width, min);
  const used = lines * min * tight;
  if (used > box.height) {
    // The title overflows alone at its minimum: it is the warning.
    return {
      default: { fontPx: min, lines, fits: false },
      subtitle: fitText(slots.subtitle, box, theme, subRange, body),
    };
  }
  // The title fits at its minimum; the subtitle is what does not fit beside it.
  const rest = { width: box.width, height: box.height - used - gap };
  return {
    default: { fontPx: min, lines, fits: true },
    subtitle: fitText(slots.subtitle, rest, theme, subRange, body),
  };
}
