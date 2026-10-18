// ffprobe wrapper (ADR-0008). It reads one media file as data and reports what
// the validator checks: kind, duration, size, frame rate and codecs. There is
// no shell: the arguments are an array, the file is an absolute path, and the
// call has a timeout. `-protocol_whitelist file` stops a container from naming
// a remote URL, so the probe never uses the network. Failures are results, not
// exceptions, and their reasons never contain the file's path.
import { spawnSync } from "node:child_process";

/** What the validator knows about one video or audio file. Video has size and fps. */
export interface MediaProbe {
  kind: "video" | "audio";
  /** ffprobe's `format_name`, e.g. `mov,mp4,m4a,3gp,3g2,mj2`. */
  container: string;
  durationS: number;
  width?: number;
  height?: number;
  /** Frames per second: `avg_frame_rate`, or `r_frame_rate` when that is 0/0. */
  fps?: number;
  videoCodec?: string;
  audioCodec?: string;
  hasAudio: boolean;
}

export type ProbeResult =
  { ok: true; media: MediaProbe } | { ok: false; reason: string };

/** Reads one file; injectable so tests can count probes. */
export type Prober = (file: string) => ProbeResult;

const TIMEOUT_MS = 10_000;
const MAX_OUTPUT = 4 * 1024 * 1024;

type Json = Record<string, unknown>;

function fail(reason: string): ProbeResult {
  return { ok: false, reason };
}

function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** `30/1` or `30000/1001` as frames per second, rounded to 3 decimals; null for 0/0 and other text. */
export function parseRate(text: unknown): number | null {
  if (typeof text !== "string") return null;
  const match = /^(\d+)\/(\d+)$/.exec(text);
  if (match === null) return null;
  const denominator = Number(match[2]);
  if (denominator === 0) return null;
  return Math.round((Number(match[1]) / denominator) * 1000) / 1000;
}

function finite(value: unknown): number | undefined {
  const number = typeof value === "string" ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number)
    ? number
    : undefined;
}

/** The first stream of `type` that is not cover art. */
function streamOf(streams: Json[], type: string): Json | undefined {
  return streams.find(
    (stream) =>
      stream["codec_type"] === type &&
      !(
        isRecord(stream["disposition"]) &&
        stream["disposition"]["attached_pic"] === 1
      ),
  );
}

/** Turns ffprobe's JSON (`-show_format -show_streams`) into a MediaProbe or a reason. */
export function parseProbe(json: unknown): ProbeResult {
  if (!isRecord(json)) return fail("ffprobe output has no format section");
  const format = isRecord(json["format"]) ? json["format"] : {};
  const streams = Array.isArray(json["streams"])
    ? json["streams"].filter(isRecord)
    : [];
  const video = streamOf(streams, "video");
  const audio = streamOf(streams, "audio");
  if (video === undefined && audio === undefined) {
    return fail("it has no video or audio stream");
  }
  const durationS = finite(format["duration"]);
  if (durationS === undefined || durationS <= 0) {
    return fail("its duration is unknown");
  }
  const base = {
    container:
      typeof format["format_name"] === "string" ? format["format_name"] : "",
    durationS,
    hasAudio: audio !== undefined,
    ...(audio === undefined ? {} : { audioCodec: String(audio["codec_name"]) }),
  };
  if (video === undefined) {
    return { ok: true, media: { kind: "audio", ...base } };
  }
  const width = finite(video["width"]);
  const height = finite(video["height"]);
  if (width === undefined || height === undefined) {
    return fail("its video size is unknown");
  }
  const fps =
    parseRate(video["avg_frame_rate"]) ?? parseRate(video["r_frame_rate"]);
  return {
    ok: true,
    media: {
      kind: "video",
      ...base,
      width,
      height,
      ...(fps === null ? {} : { fps }),
      videoCodec: String(video["codec_name"]),
    },
  };
}

/** Probes one media file (an absolute path). Never throws; never prints the path. */
export function probeFile(file: string): ProbeResult {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-protocol_whitelist",
      "file",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      file,
    ],
    {
      encoding: "utf8",
      shell: false,
      timeout: TIMEOUT_MS,
      maxBuffer: MAX_OUTPUT,
      windowsHide: true,
    },
  );
  if (result.error !== undefined) {
    const code = (result.error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return fail("ffprobe is not on PATH");
    if (code === "ETIMEDOUT") return fail("ffprobe timed out");
    return fail("ffprobe could not run");
  }
  if (result.status !== 0) return fail("ffprobe could not read the file");
  let json: unknown;
  try {
    json = JSON.parse(result.stdout);
  } catch {
    return fail("ffprobe output is not JSON");
  }
  return parseProbe(json);
}
