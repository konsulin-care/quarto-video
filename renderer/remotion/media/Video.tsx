// The background footage of a scene (task 039; PRD §6.1). Each scene frame draws
// one source frame, the one `sourceFrameAt` names: an OffthreadVideo at that
// frame inside a one-frame Sequence, so no frame depends on the one before it.
// The picture is muted: source audio plays through SourceAudio (task 044). Framing is the shared fit
// (media/fit.ts), the same one the image component uses.
import type { IrMediaVideo } from "@quarto-video/ir";
import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { fitStyle } from "./fit.js";
import { planOf, sourceFrameAt } from "./schedule.js";

export interface FootageProps {
  media: IrMediaVideo;
}

/**
 * The clip, filling its positioned parent (task 039, shared with framed footage,
 * task 040): one muted frame per scene frame, at the source frame `sourceFrameAt`
 * names, framed by `fit`.
 */
export function Footage({ media }: FootageProps) {
  const frame = useCurrentFrame();
  const source = sourceFrameAt(frame, planOf(media));
  return (
    <Sequence from={frame} durationInFrames={1}>
      <AbsoluteFill>
        <OffthreadVideo
          src={staticFile(media.src)}
          startFrom={source}
          muted
          style={fitStyle(media.fit)}
        />
      </AbsoluteFill>
    </Sequence>
  );
}

/** Background footage: the clip over the whole canvas (task 039). */
export function BackgroundVideo({ media }: FootageProps) {
  return <Footage media={media} />;
}
