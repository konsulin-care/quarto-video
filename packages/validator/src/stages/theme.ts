// Theme resolution (PRD §5.2, §10): the `theme` a document names must be a
// registered theme. Stage 2, against the registry. Pure: the themes are passed
// in, so tests can use their own. No theme named means DEFAULT_THEME.
import {
  DEFAULT_THEME,
  listThemes,
  type ThemeTokens,
} from "@quarto-video/registry";
import type { Diagnostic } from "../diagnostic.js";

export interface ThemeCheck {
  /** The resolved theme; null when the name is unknown. */
  theme: ThemeTokens | null;
  diagnostics: Diagnostic[];
}

/** Resolves `name` (the document's `theme`, or null when omitted) for `file`. */
export function checkTheme(
  name: string | null,
  file: string,
  themes: readonly ThemeTokens[] = listThemes(),
): ThemeCheck {
  const wanted = name ?? DEFAULT_THEME;
  const found = themes.find((theme) => theme.id === wanted);
  if (found !== undefined) {
    return { theme: found, diagnostics: [] };
  }
  const available = themes.map((theme) => theme.id).join(", ");
  return {
    theme: null,
    diagnostics: [
      {
        severity: "error",
        code: "E_THEME_UNKNOWN",
        message: `Unknown theme "${wanted}".`,
        file,
        property: "theme",
        suggestion: `Available themes: ${available}.`,
      },
    ],
  };
}
