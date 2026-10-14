// Reads what the renderer wrote, as the input of the stage 6 check
// (packages/validator/src/stages/output.ts). ffprobe reads the file as data.
import { spawnSync } from "node:child_process";
import { statSync, type Stats } from "node:fs";
import type { OutputFacts, VideoFacts } from "@quarto-video/validator";

/** `30/1` or `30000/1001` as frames per second; null for anything else. */
export function parseRate(text: string): number | null {
  const match = /^(\d+)\/(\d+)$/.exec(text);
  if (match === null) return null;
  const denominator = Number(match[2]);
  return denominator === 0 ? null : Number(match[1]) / denominator;
}

/** Width, height, fps and decoded frames of the first video stream; null when unreadable. */
export function probeVideo(file: string): VideoFacts | null {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-count_frames",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,r_frame_rate,nb_read_frames",
      "-of",
      "json",
      file,
    ],
    { encoding: "utf8" },
  );
  if (result.error !== undefined || result.status !== 0) return null;
  let streams: Record<string, unknown>[];
  try {
    streams =
      (JSON.parse(result.stdout) as { streams?: Record<string, unknown>[] })
        .streams ?? [];
  } catch {
    return null;
  }
  const stream = streams[0];
  if (stream === undefined) return null;
  const fps = parseRate(String(stream["r_frame_rate"]));
  const facts = {
    width: Number(stream["width"]),
    height: Number(stream["height"]),
    fps: fps ?? Number.NaN,
    frames: Number(stream["nb_read_frames"]),
  };
  return Object.values(facts).every(Number.isFinite) ? facts : null;
}

/** Facts for stage 6: whether `file` exists and is non-empty, and what ffprobe reads from it. */
export function readOutputFacts(file: string, name: string): OutputFacts {
  const info = statOrNull(file);
  const exists = info !== null && info.isFile();
  const bytes = exists ? info.size : 0;
  return {
    file: name,
    exists,
    bytes,
    video: exists && bytes > 0 ? probeVideo(file) : null,
  };
}

function statOrNull(file: string): Stats | null {
  try {
    return statSync(file);
  } catch {
    return null;
  }
}
