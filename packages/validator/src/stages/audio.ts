// Stage 3 source-audio check for one `.video` block with audio="keep" (task 044;
// ADR-0009). Pure: the probe result comes in, so no file is read here. A kept
// clip whose file has no audio stream is E_AUDIO_NO_STREAM: the sound cannot be
// kept, and a silent substitute would hide the mismatch. A muted clip is never
// checked. The rate and volume rules are the filter's (lib/media_props.lua).
import type { AssetProblem } from "../assets/syntax.js";
import type { MediaProbe } from "../media/probe.js";

/** The problem with a kept clip at `path`, or null when its file has an audio stream. */
export function keptAudioProblem(
  path: string,
  media: Pick<MediaProbe, "hasAudio">,
): AssetProblem | null {
  if (media.hasAudio) return null;
  return {
    ok: false,
    code: "E_AUDIO_NO_STREAM",
    message: `Asset "${path}" has no audio stream, but its block keeps the source audio.`,
    suggestion:
      'Use a file with an audio track, or set audio="mute" for footage without sound (ADR-0009).',
    assetPath: path,
  };
}
