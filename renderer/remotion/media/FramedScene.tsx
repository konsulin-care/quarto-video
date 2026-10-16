// A scene over framed footage (task 040; PRD §6.1, §10.2): the footage sits on
// its screen inside a device frame, at the largest size of the frame's shape in
// the canvas safe area, above the caption band (task 041) when there is one. The
// scene's content draws on top. FramedFootage draws the frame and the footage.
import type { IrMediaVideo } from "@quarto-video/ir";
import type { ReactNode } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { safeAreaPixels, safeBox } from "@quarto-video/registry/layout";
import { useTheme } from "../themes/ThemeProvider.js";
import { FramedFootage } from "./FramedFootage.js";
import { frameContract } from "./frames/tokens.js";
import { captionBand } from "./frames/caption.js";
import { fitFrame } from "./frames/layout.js";

export interface FramedSceneProps {
  media: IrMediaVideo;
  /** The caption under the frame, if any: its band is reserved (task 041). */
  caption?: string;
  children: ReactNode;
}

export function FramedScene({
  media,
  caption = "",
  children,
}: FramedSceneProps) {
  const theme = useTheme();
  const { width, height } = useVideoConfig();
  const contract = frameContract(media.frame ?? "");
  const margin = safeAreaPixels(theme, width, height);
  const safe = safeBox(theme, width, height);
  const reserve = caption === "" ? 0 : captionBand(theme, caption, safe.width);
  const box = fitFrame(
    {
      left: margin.x,
      top: margin.y,
      width: safe.width,
      height: safe.height - reserve,
    },
    contract.aspect,
  );
  return (
    <AbsoluteFill>
      <FramedFootage media={media} box={box} />
      {children}
    </AbsoluteFill>
  );
}
