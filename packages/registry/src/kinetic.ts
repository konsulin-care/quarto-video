// Word rule of the `kinetic` preset (PRD §5.6; task 026). Shared by the
// validator (the W_ANIMATION_FALLBACK warning) and the renderer (the fallback
// to fade-in), so both count the same words. Pure.

/**
 * Most words a kinetic statement shows word by word. A statement with more
 * words is drawn with fade-in instead, and the validator warns about it. Twelve
 * keeps the words readable as they appear, even in a short scene.
 */
export const KINETIC_MAX_WORDS = 12;

/** The words of `text`: each run of non-space characters, as a reader counts them. */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => word !== "").length;
}

/** True when kinetic falls back to fade-in for a statement whose text is `text`. */
export function kineticFallsBack(text: string): boolean {
  return countWords(text) > KINETIC_MAX_WORDS;
}
