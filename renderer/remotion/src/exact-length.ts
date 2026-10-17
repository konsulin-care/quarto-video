// The output's length and start are the timeline's (task 045; ADR-0017; PRD §7.2).
// Two corrections to the stitch command, both pure over its argument list:
// - `-t frames/fps` cuts the stitched output to the composition's frames. The
//   encoder pads the last AAC frame, so without it the audio ran about 60 ms past
//   the last frame.
// - `-itsoffset` moves the pre-encoded audio earlier by the encoder's delay. The
//   audio is muxed with `-c:a copy` and its first sample lands about 42.7 ms after
//   frame 0 (measured: the first audible sample of a rendered track is sample 1882
//   at 44.1 kHz). That is 2048 samples at 48 kHz, the priming delay of the 48 kHz
//   AAC encoder the output uses; a plain AAC file has no such lead. Removing it
//   puts sample 0 of the audio at frame 0.

/** The output audio rate: Remotion encodes at 48 kHz. */
export const OUTPUT_AUDIO_RATE = 48000;

/** The AAC encoder's priming delay in samples at the output rate (measured; see above). */
export const ENCODER_DELAY_SAMPLES = 2048;

/** The encoder delay in seconds: the lead that the audio input is moved earlier by. */
export const ENCODER_DELAY_SECONDS = ENCODER_DELAY_SAMPLES / OUTPUT_AUDIO_RATE;

/** The stitch arguments with `-t` set to `frames / fps` seconds, before the output file. */
export function cutToFrames(
  args: readonly string[],
  frames: number,
  fps: number,
): string[] {
  const output = args[args.length - 1];
  if (output === undefined) return [...args];
  return [...args.slice(0, -1), "-t", (frames / fps).toFixed(6), output];
}

/**
 * The stitch arguments with the pre-encoded audio input moved earlier by `lead`
 * seconds (`-itsoffset` before its `-i`). The audio input is the `-i <file>` that
 * precedes `-c:a copy`. Arguments without that pair are returned unchanged.
 */
export function alignAudio(
  args: readonly string[],
  lead: number = ENCODER_DELAY_SECONDS,
): string[] {
  const copy = args.findIndex(
    (arg, index) =>
      arg === "-c:a" && args[index + 1] === "copy" && args[index - 2] === "-i",
  );
  if (copy < 0) return [...args];
  const input = copy - 2;
  return [
    ...args.slice(0, input),
    "-itsoffset",
    (-lead).toFixed(9),
    ...args.slice(input),
  ];
}
