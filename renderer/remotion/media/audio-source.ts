// The file a kept clip's or the music track's sound is read from (task 044 follow-up;
// ADR-0009). It is the project file itself, except for a mono source, which is read
// from its stereo copy (src/stereo-sources.ts). The picture always uses the project
// file. Pure: no Node, no browser APIs.

/** Project-relative source path to the file its sound is read from. */
export type AudioSources = Record<string, string>;

/** The file to play for the project-relative `src`: its stereo copy when it has one. */
export function audioSourceOf(
  src: string,
  sources: AudioSources | undefined,
): string {
  return sources?.[src] ?? src;
}
