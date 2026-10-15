// The size of a statistic's number (task 031). The number is drawn at the
// largest size up to `maxPx` at which its text fits `width`, and never below
// `minPx`; a unit is drawn at UNIT_SCALE of that size. The estimate is the
// registry's glyph width (GLYPH_EM, packages/registry/src/layout.ts), the same
// one the text-fit rule uses. Pure: the same text and width give the same size.
import { GLYPH_EM } from "@quarto-video/registry/layout";

/** A unit is drawn at this share of the number's size. */
export const UNIT_SCALE = 0.5;

/**
 * The font size in pixels for a prefix, a formatted number and a unit, in a
 * line `width` pixels wide. A unit counts at UNIT_SCALE of a glyph.
 */
export function numberFontPx(
  parts: { prefix: string; digits: string; unit: string },
  width: number,
  maxPx: number,
  minPx: number,
): number {
  const glyphs =
    parts.prefix.length + parts.digits.length + parts.unit.length * UNIT_SCALE;
  const fit = Math.floor(width / (GLYPH_EM * Math.max(1, glyphs)));
  return Math.min(maxPx, Math.max(minPx, fit));
}
