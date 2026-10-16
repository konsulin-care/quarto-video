// The source sound of a kept `.video` block (task 044; ADR-0009; PRD §7.2). The
// picture stays muted (Video.tsx); this plays the clip's audio, one <Audio> per
// pass over its source range (media/audio.ts), each in its own Sequence so it
// starts and stops on the scene's frames. The gain is a function of the scene
// frame, so the transition overlaps fade it. Mounted by IrVideo for every kept
// block of a scene, whichever component draws its picture.
import type { IrMediaVideo } from "@quarto-video/ir";
import { Audio, Sequence, staticFile } from "remotion";
import { audioSegmentsOf, gainAt } from "./audio.js";

export interface SourceAudioProps {
  media: IrMediaVideo;
  /** The scene's duration in frames. */
  durationFrames: number;
  /** Frames of the overlap with the previous scene (0 for a cut or none). */
  incomingFrames: number;
  /** Frames of the overlap with the next scene (0 for a cut or none). */
  outgoingFrames: number;
}

export function SourceAudio({
  media,
  durationFrames,
  incomingFrames,
  outgoingFrames,
}: SourceAudioProps) {
  const volume = media.volume ?? 1;
  const ramp = {
    durationFrames,
    incoming: incomingFrames,
    outgoing: outgoingFrames,
  };
  return (
    <>
      {audioSegmentsOf(media, durationFrames).map((pass) => (
        <Sequence
          key={pass.from}
          from={pass.from}
          durationInFrames={pass.frames}
        >
          <Audio
            src={staticFile(media.src)}
            trimBefore={pass.trimBefore}
            volume={(frame: number) => gainAt(frame + pass.from, volume, ramp)}
          />
        </Sequence>
      ))}
    </>
  );
}
