// The project captions as drawn (task 046; ADR-0019; PRD §12). Pure: the cue on a
// frame, the captions a render burns, and the caption style from the theme's
// tokens. A cue shows on frames startFrame up to endFrame (exclusive). The style
// is an opaque panel in the theme's background colour under the theme's text
// colour, so the text meets the theme's contrast pair over any picture behind it.
import type { IrCaptionCue, IrCaptions } from "@quarto-video/ir";
import type { ThemeTokens } from "@quarto-video/registry";
import { safeAreaPixels } from "@quarto-video/registry/layout";

/** The cues a render draws over the picture: burn and both modes (ADR-0019); none otherwise. */
export function burnedCues(
  captions: IrCaptions | undefined,
): readonly IrCaptionCue[] | undefined {
  if (captions === undefined || captions.cues === undefined) return undefined;
  return captions.mode === "sidecar" ? undefined : captions.cues;
}

/** The cue shown on `frame`, or undefined when none is (cues do not overlap, ADR-0019). */
export function cueAt(
  cues: readonly IrCaptionCue[],
  frame: number,
): IrCaptionCue | undefined {
  return cues.find((cue) => frame >= cue.startFrame && frame < cue.endFrame);
}

export interface CaptionStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  textColor: string;
  panelColor: string;
  /** The panel is opaque, so the picture behind it never reaches the text. */
  panelOpacity: 1;
  radius: number;
  padX: number;
  padY: number;
}

/** The caption style from the theme's tokens: the caption size, the body line height, the semibold weight. */
export function captionStyle(theme: ThemeTokens): CaptionStyle {
  return {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.scale.caption,
    fontWeight: theme.typography.weights.semibold,
    lineHeight: theme.typography.lineHeight.body,
    textColor: theme.colors.text,
    panelColor: theme.colors.background,
    panelOpacity: 1,
    radius: theme.radius.sm,
    padX: theme.space.sm,
    padY: theme.space.xs,
  };
}

export interface CaptionPlacement {
  /** Distance from the bottom edge: the safe area's vertical margin. */
  bottom: number;
  /** Horizontal margin: the safe area's, so the panel stays inside it. */
  sideMargin: number;
}

/** Where the caption panel sits: at the bottom of the safe area (PRD §10.2). */
export function captionPlacement(
  theme: ThemeTokens,
  width: number,
  height: number,
): CaptionPlacement {
  const margin = safeAreaPixels(theme, width, height);
  return { bottom: margin.y, sideMargin: margin.x };
}
