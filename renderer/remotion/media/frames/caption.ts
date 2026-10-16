// The caption band under a framed picture (task 041; PRD §10.2). The band is
// reserved at the bottom of the safe area: the frame is fitted above it, so the
// caption never covers the footage. Its height is `CAPTION_LINES` lines of the
// caption size (the type scale's `caption` role, 28 px in the modern theme) at
// the body line height, plus the theme's `sm` space above the
// text. Pure: the same theme and canvas always give the same band.
import type { ThemeTokens } from "@quarto-video/registry";

/** Lines the band holds; a longer caption runs into the bottom margin (known limit). */
export const CAPTION_LINES = 2;

/** The band's height in output pixels for `theme`. */
export function captionBand(theme: ThemeTokens): number {
  const { scale, lineHeight } = theme.typography;
  return Math.ceil(
    CAPTION_LINES * scale.caption * lineHeight.body + theme.space.sm,
  );
}
