// The project music track (task 045; ADR-0017; PRD §7.2). One <Audio> per pass
// (media/music.ts), each in its own Sequence so it starts and stops on the
// timeline's frames. The gain is a function of the timeline frame, so the
// fade-out is part of the picture's timing, not of the render's clock. Mounted
// once by IrVideo, over the whole timeline, beside the scenes' source audio.
import type { IrMusic } from "@quarto-video/ir";
import { Audio, Sequence, staticFile } from "remotion";
import { musicGainAt, musicPassesOf } from "./music.js";

export interface MusicTrackProps {
  music: IrMusic;
  /** The timeline's length in frames: the track ends on its last frame. */
  durationFrames: number;
  /** The file the track is read from: the project file, or its stereo copy (media/audio-source.ts). */
  file: string;
}

export function MusicTrack({ music, durationFrames, file }: MusicTrackProps) {
  return (
    <>
      {musicPassesOf(music, durationFrames).map((pass) => (
        <Sequence
          key={pass.from}
          from={pass.from}
          durationInFrames={pass.frames}
        >
          <Audio
            src={staticFile(file)}
            volume={(frame: number) =>
              musicGainAt(frame + pass.from, music, durationFrames)
            }
          />
        </Sequence>
      ))}
    </>
  );
}
