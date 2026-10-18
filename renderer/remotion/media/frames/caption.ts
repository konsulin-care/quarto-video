// The caption band under a framed picture (task 041; PRD §10.2). The band is
// reserved at the bottom of the safe area and the frame is fitted above it, so
// the caption never covers the footage. The band holds the caption's lines, as
// the registry's line count estimates them at the caption size (the type scale's
// `caption` role), at the body line height, plus the theme's `sm` space above
// the text. A longer caption takes a taller band. Pure: the same text, theme and
// width always give the same band.
import type { ThemeTokens } from "@quarto-video/registry";
import { countLines, GLYPH_EM } from "@quarto-video/registry/layout";

/** Lines the caption takes in `width` px (at least one, even for an empty caption). */
export function captionLines(
  text: string,
  width: number,
  theme: ThemeTokens,
): number {
  const capacity = Math.max(
    1,
    Math.floor(width / (GLYPH_EM * theme.typography.scale.caption)),
  );
  return Math.max(1, countLines(text, capacity));
}

/** The band's height in output pixels for `text` in `width` px. */
export function captionBand(
  theme: ThemeTokens,
  text: string,
  width: number,
): number {
  const { scale, lineHeight } = theme.typography;
  const lines = captionLines(text, width, theme);
  return Math.ceil(lines * scale.caption * lineHeight.body + theme.space.sm);
}
