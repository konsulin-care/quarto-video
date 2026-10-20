// The caption layer of a burned render (task 046; ADR-0019): the cue on the current
// frame, drawn in a panel at the bottom of the safe area, above every scene. Nothing
// is drawn on a frame with no cue. The frame comes from Remotion's frame counter,
// which the render sets, never from the clock (PRD §8.4).
import type { IrCaptionCue } from "@quarto-video/ir";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../themes/ThemeProvider.js";
import { captionPlacement, captionStyle, cueAt } from "./captions.js";

export interface CaptionLayerProps {
  cues: readonly IrCaptionCue[];
}

export function CaptionLayer({ cues }: CaptionLayerProps) {
  const theme = useTheme();
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const cue = cueAt(cues, frame);
  if (cue === undefined) return null;
  const style = captionStyle(theme);
  const place = captionPlacement(theme, width, height);
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingLeft: place.sideMargin,
        paddingRight: place.sideMargin,
        paddingBottom: place.bottom,
      }}
    >
      <div
        style={{
          maxWidth: "100%",
          boxSizing: "border-box",
          backgroundColor: style.panelColor,
          opacity: style.panelOpacity,
          borderRadius: style.radius,
          padding: `${style.padY}px ${style.padX}px`,
          color: style.textColor,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          textAlign: "center",
          whiteSpace: "pre-line",
        }}
      >
        {cue.text}
      </div>
    </AbsoluteFill>
  );
}
