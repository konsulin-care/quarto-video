// A scene over background footage (task 039; PRD §6.1, §10.2): the footage fills
// the canvas, the theme's scrim (its background colour at `scrim.opacity`) sits
// over it for legibility, and the scene's content draws on top.
import type { IrMediaVideo } from "@quarto-video/ir";
import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { useTheme } from "../themes/ThemeProvider.js";
import { BackgroundVideo } from "./Video.js";

export interface BackgroundSceneProps {
  media: IrMediaVideo;
  children: ReactNode;
}

export function BackgroundScene({ media, children }: BackgroundSceneProps) {
  const theme = useTheme();
  return (
    <AbsoluteFill>
      <BackgroundVideo media={media} />
      <AbsoluteFill
        style={{
          backgroundColor: theme.colors.background,
          opacity: theme.scrim.opacity,
        }}
      />
      {children}
    </AbsoluteFill>
  );
}
