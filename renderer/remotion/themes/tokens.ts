// Theme ids the renderer can draw, with their tokens (PRD §10). The ids and
// the token files live in packages/registry (checked there); the renderer's
// parity test keeps this map equal to the registry's list.
import modern from "@quarto-video/registry/themes/modern.json" with { type: "json" };
import type { ThemeTokens } from "@quarto-video/registry";

/** The theme used when none is named. */
export const DEFAULT_THEME_ID = "modern";

// The registry loader checks each file (schema, AA contrast) before the build.
const TOKENS: Readonly<Record<string, ThemeTokens>> = {
  modern: modern as ThemeTokens,
};

/** The ids this renderer draws, sorted. */
export function themeIds(): string[] {
  return Object.keys(TOKENS).sort();
}

/** Tokens for `id`; an unknown id is an Error naming the known ids. */
export function themeTokens(id: string): ThemeTokens {
  const found = TOKENS[id];
  if (found === undefined) {
    throw new Error(`unknown theme "${id}" (known: ${themeIds().join(", ")})`);
  }
  return found;
}
