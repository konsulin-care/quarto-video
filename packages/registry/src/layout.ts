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

/** A rectangle in output pixels: left and top from the canvas origin. */
export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The side the footage takes in `text-media` (task 042). */
export type MediaSide = "left" | "right";

/** The `side` default of text-media.json: the footage on the right. */
export const DEFAULT_MEDIA_SIDE: MediaSide = "right";

/** The `side` a text-media scene's prop gives; the default when absent or unknown (the validator rejects those). */
export function mediaSideOf(value: unknown): MediaSide {
  return value === "left" ? "left" : DEFAULT_MEDIA_SIDE;
}

/**
 * `count` equal columns of `area`, left to right, with `gap` between them (task
 * 043). The width an uneven split leaves over goes to the last column. The
 * columns never overlap and lie inside `area`.
 */
export function splitColumns(area: Rect, count: number, gap: number): Rect[] {
  const width = Math.floor((area.width - gap * (count - 1)) / count);
  const right = area.left + area.width;
  const columns: Rect[] = [];
  let left = area.left;
  for (let index = 0; index < count; index += 1) {
    const last = index === count - 1;
    const columnWidth = last ? right - left : width;
    columns.push({
      left,
      top: area.top,
      width: columnWidth,
      height: area.height,
    });
    left += columnWidth + gap;
  }
  return columns;
}

/**
 * The two columns of `text-media` (task 042) inside `area`: the footage column
 * on `side`, the text column on the other side, with `gap` between them. The
 * columns never overlap and lie inside `area`; the width left over by an odd
 * `area` goes to the text column. Pure, so the validator fits the text in the
 * same column the renderer draws it in.
 */
export function sideColumns(
  area: Rect,
  side: MediaSide,
  gap: number,
): { text: Rect; media: Rect } {
  const [first = area, second = area] = splitColumns(area, 2, gap);
  return side === "left"
    ? { media: first, text: second }
    : { text: first, media: second };
}

/** The canvas safe area as a rectangle (task 042). */
function safeRect(theme: ThemeTokens, width: number, height: number): Rect {
  const margin = safeAreaPixels(theme, width, height);
  return { left: margin.x, top: margin.y, ...safeBox(theme, width, height) };
}

/**
 * The text and footage columns of `text-media` on a `width` x `height` canvas
 * (task 042): the two columns share the canvas safe area, with `space.md`
 * between them. The validator fits the text in the same `text` box the renderer
 * draws it in.
 */
export function textMediaColumns(
  theme: ThemeTokens,
  width: number,
  height: number,
  side: MediaSide,
): { text: Rect; media: Rect } {
  return sideColumns(safeRect(theme, width, height), side, theme.space.md);
}

/** The region names of split-screen, left to right (task 043; ADR-0016). */
export const REGION_ORDER = ["left", "middle", "right"] as const;

/**
 * The columns of `count` regions (task 043) on a `width` x `height` canvas: the
 * canvas safe area split with `space.md` between them. The renderer draws each
 * region in its column, in REGION_ORDER.
 */
export function regionColumns(
  theme: ThemeTokens,
  width: number,
  height: number,
  count: number,
): Rect[] {
  return splitColumns(safeRect(theme, width, height), count, theme.space.md);
}
