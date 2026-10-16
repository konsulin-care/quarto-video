// A scene over framed footage (task 040; PRD §6.1, §10.2): the footage sits on
// its screen inside a device frame, at the largest size of the frame's shape in
// the canvas safe area. The theme's scrim sits over the footage on the screen (the
// frame's body keeps its colour), and the scene's content draws on top. The screen
// clips the footage to its safe content box.
import type { IrMediaVideo } from "@quarto-video/ir";
import type { ReactNode } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { safeBox } from "@quarto-video/registry/layout";
import { useTheme } from "../themes/ThemeProvider.js";
import { Footage } from "./Video.js";
import { FrameShell } from "./frames/FrameShell.js";
import { frameContract } from "./frames/tokens.js";
import { frameBox, screenBox } from "./frames/layout.js";

export interface FramedSceneProps {
  media: IrMediaVideo;
  children: ReactNode;
}

export function FramedScene({ media, children }: FramedSceneProps) {
  const theme = useTheme();
  const { width, height } = useVideoConfig();
  const contract = frameContract(media.frame ?? "");
  const box = frameBox(
    { width, height },
    safeBox(theme, width, height),
    contract.aspect,
  );
  const screen = screenBox(contract, box);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
        }}
      >
        <FrameShell contract={contract} />
        <div
          style={{
            position: "absolute",
            left: screen.left,
            top: screen.top,
            width: screen.width,
            height: screen.height,
            overflow: "hidden",
            backgroundColor: theme.colors.background,
            borderRadius: theme.radius.sm,
          }}
        >
          <Footage media={media} />
          <AbsoluteFill
            style={{
              backgroundColor: theme.colors.background,
              opacity: theme.scrim.opacity,
            }}
          />
        </div>
      </div>
      {children}
    </AbsoluteFill>
  );
}
