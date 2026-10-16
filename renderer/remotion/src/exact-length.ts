// The output's length is the timeline's (task 045; ADR-0017; PRD §7.2). The encoder
// pads the last AAC frame, so the stitched audio runs past the last video frame by
// up to about 60 ms. The stitch command gets an output duration of the composition's
// frames at its fps, placed before the output file (the last argument). Pure.

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
