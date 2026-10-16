// A device frame with footage on its screen (task 040; PRD §6.1). `box` is the
// frame's box in the coordinates of the positioned parent. The footage is clipped
// to the frame's screen (its safe content box) and the theme's scrim sits over
// it. FramedScene places it in the canvas safe area; text-media places it in its
// own column (task 042).
import type { IrMediaVideo } from "@quarto-video/ir";
import { useTheme } from "../themes/ThemeProvider.js";
import { Footage } from "./Video.js";
import { FrameShell } from "./frames/FrameShell.js";
import { frameContract } from "./frames/tokens.js";
import { screenBox, type Rect } from "./frames/layout.js";
import { AbsoluteFill } from "remotion";

export interface FramedFootageProps {
  media: IrMediaVideo;
  /** The frame's box, in output pixels of the parent. */
  box: Rect;
}

export function FramedFootage({ media, box }: FramedFootageProps) {
  const theme = useTheme();
  const contract = frameContract(media.frame ?? "");
  const screen = screenBox(contract, box);
  return (
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
  );
}
