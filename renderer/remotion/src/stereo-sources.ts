// Mono sources at their file's level (task 044 follow-up; ADR-0009). Remotion converts
// every audio file to stereo with ffmpeg's default mix, which puts a mono channel into
// both outputs at -3 dB, so a mono clip or track plays 3 dB quiet. A mono source is
// therefore played from a stereo copy whose one channel is on both L and R at unity
// gain (`pan`). The copies sit in <assetRoot>/.video-build/audio-stereo/, which is
// inside the public folder Remotion serves. Stereo and multichannel sources are not
// copied, so they keep Remotion's own mix. The IR is never rewritten.
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import type { IrVideo } from "@quarto-video/ir";
import type { AudioSources } from "../media/audio-source.js";

const run = promisify(execFile);

/** Where the stereo copies go, relative to the project root (the public folder). */
export const STEREO_DIR = ".video-build/audio-stereo";

/** The project files whose sound is played: kept footage and the music track, once each. */
export function soundSourcesOf(ir: IrVideo): string[] {
  const sources = new Set<string>();
  for (const scene of ir.scenes) {
    if (!("media" in scene) || scene.media === undefined) continue;
    for (const item of scene.media) {
      if (item.kind !== "image" && item.audio === "keep") sources.add(item.src);
    }
  }
  if ("music" in ir && ir.music !== undefined) sources.add(ir.music.src);
  return [...sources];
}

/** The ffmpeg arguments that write the first audio stream of `src` to `out` as stereo. */
export function stereoArgs(src: string, out: string): string[] {
  return [
    "-v",
    "error",
    "-y",
    "-i",
    src,
    "-map",
    "0:a:0",
    "-af",
    "pan=stereo|c0=c0|c1=c0",
    "-c:a",
    "pcm_f32le",
    out,
  ];
}

/** The copy's file name: a digest of the project-relative source path. */
export function stereoFileName(src: string): string {
  return `${createHash("sha1").update(src).digest("hex").slice(0, 16)}.wav`;
}

/** The channel count of the first audio stream of `file` (0 when it has none). */
async function audioChannels(file: string): Promise<number> {
  const { stdout } = await run("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "a:0",
    "-show_entries",
    "stream=channels",
    "-of",
    "csv=p=0",
    file,
  ]);
  return Number.parseInt(stdout.trim(), 10) || 0;
}

/**
 * Writes a stereo copy of every mono sound source of `ir` under `assetRoot`. Returns
 * the map from each copied project-relative source to its copy's path (relative to
 * `assetRoot`). Sources with another channel count are not in the map.
 */
export async function prepareStereoSources(
  ir: IrVideo,
  assetRoot: string,
): Promise<AudioSources> {
  const sources: AudioSources = {};
  const dir = join(assetRoot, STEREO_DIR);
  for (const src of soundSourcesOf(ir)) {
    const file = join(assetRoot, src);
    if ((await audioChannels(file)) !== 1) continue;
    await mkdir(dir, { recursive: true });
    const name = stereoFileName(src);
    await run("ffmpeg", stereoArgs(file, join(dir, name)));
    sources[src] = `${STEREO_DIR}/${name}`;
  }
  return sources;
}
