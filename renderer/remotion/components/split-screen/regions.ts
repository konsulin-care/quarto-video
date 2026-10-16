// The regions a split-screen scene draws (task 043; ADR-0016), pure so the
// layout test needs no browser. A region is drawn when it has text or footage;
// the drawn regions take the columns of the canvas in REGION_ORDER. The text of
// the text regions shares one size: the smallest any of them fits, and no word
// breaks across lines.
import type { TextFit, ThemeTokens } from "@quarto-video/registry";
import {
  fitText,
  GLYPH_EM,
  REGION_ORDER,
  type Rect,
} from "@quarto-video/registry/layout";

/** The region names drawn, left to right: those with text or with footage. */
export function drawnRegions(
  texts: Readonly<Record<string, string>>,
  footage: Readonly<Record<string, unknown>>,
): string[] {
  return REGION_ORDER.filter(
    (name) => (texts[name] ?? "") !== "" || footage[name] !== undefined,
  );
}

/** The longest word of `text`, in characters. */
function longestWord(text: string): number {
  return text
    .split(/\s+/)
    .reduce((longest, word) => Math.max(longest, word.length), 0);
}

/**
 * The font size one region's text takes: the largest in `fit` that fits its box
 * (fitText), reduced until its longest word fits the box width, so a word never
 * breaks. A word wider than the box at the smallest size keeps that size.
 */
export function regionFontPx(
  text: string,
  box: Rect,
  theme: ThemeTokens,
  fit: TextFit,
): number {
  const { fontPx } = fitText(text, box, theme, fit);
  const word = longestWord(text);
  if (word === 0) return fontPx;
  const wordCap = Math.floor(box.width / (GLYPH_EM * word));
  return Math.min(fontPx, Math.max(wordCap, theme.typography.scale[fit.min]));
}

/** The one size of every text region: the smallest of their sizes. */
export function sharedTextPx(
  regions: ReadonlyArray<{ text: string; box: Rect }>,
  theme: ThemeTokens,
  fit: TextFit,
): number {
  return Math.min(
    ...regions.map(({ text, box }) => regionFontPx(text, box, theme, fit)),
  );
}
