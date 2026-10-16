// The canvas colour (PRD §10, task 019a): the author's explicit video.background
// when one is set, else the selected theme's `background` token. The IR's
// settings.background is the filter's default (#000000) and is not used here.
import type { ThemeTokens } from "@quarto-video/registry";
import { IrRenderError } from "../src/errors.js";

const HEX_COLOUR = /^#[0-9A-Fa-f]{6}$/;

/** The colour the canvas is filled with. A malformed explicit value is an IrRenderError. */
export function canvasBackground(
  theme: ThemeTokens,
  explicit?: string | null,
): string {
  if (explicit === undefined || explicit === null) {
    return theme.colors.background;
  }
  if (!HEX_COLOUR.test(explicit)) {
    throw new IrRenderError(
      `background must be a hex colour like "#10131C", got "${explicit}"`,
    );
  }
  return explicit;
}
