// A still image held for its scene (IR 1.10, ADR-0018): framed footage with no
// source range, sound or playback speed. It draws the same picture at every frame,
// so the render is a pure function of the frame number. It takes the image
// component's path (components/image/Image.tsx: staticFile, Img and the shared fit).
import type { IrMediaImage } from "@quarto-video/ir";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { fitStyle } from "./fit.js";

export interface StillProps {
  media: IrMediaImage;
}

/** The picture, filling its positioned parent and framed by `fit` (ADR-0013, shared with video). */
export function Still({ media }: StillProps) {
  return (
    <AbsoluteFill>
      <Img
        src={staticFile(media.src)}
        alt={media.alt}
        style={fitStyle(media.fit)}
      />
    </AbsoluteFill>
  );
}
