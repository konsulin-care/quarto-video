// The guaranteed media formats (ADR-0008): a pure table and its checks. No file
// access and no ffprobe here. Extensions match case-insensitively. Codecs are
// the names ffprobe reports (`codec_name`). A problem is E_MEDIA_FORMAT.
import type { AssetProblem } from "../assets/syntax.js";
import type { MediaProbe } from "./probe.js";

/** What a reference is used for: an image block (ADR-0013), or a video or audio source (task 038). */
export type MediaUse = "image" | "video" | "audio";

/** Extensions per use (ADR-0008). Fonts are listed for the features that reference them. */
export const FORMATS = {
  image: [".png", ".jpg", ".jpeg", ".webp", ".svg"],
  video: [".mp4", ".webm"],
  audio: [".wav"],
  font: [".woff2", ".woff", ".ttf", ".otf"],
} as const;

/** The codecs a video extension accepts: its video codec, and its optional audio codecs. */
const VIDEO_CODECS: Record<
  ".mp4" | ".webm",
  { video: readonly string[]; audio: readonly string[] }
> = {
  ".mp4": { video: ["h264"], audio: ["aac"] },
  ".webm": { video: ["vp8", "vp9"], audio: ["opus", "vorbis"] },
};

/** The formats of each use, as the suggestion lists them. */
const SUPPORTED_TEXT: Record<MediaUse, string> = {
  image: ".png, .jpg, .jpeg, .webp, .svg",
  video:
    ".mp4 (H.264 video, optional AAC audio), .webm (VP8 or VP9 video, optional Opus or Vorbis audio)",
  audio: ".wav (PCM audio)",
};

/** The lower-case extension with its dot (`.png`), or "" when there is none. */
export function extensionOf(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? "" : name.slice(dot).toLowerCase();
}

function unsupported(
  use: MediaUse,
  path: string,
  reason: string,
): AssetProblem {
  return {
    ok: false,
    code: "E_MEDIA_FORMAT",
    message: `Asset "${path}" ${reason}.`,
    suggestion: `Supported ${use} formats: ${SUPPORTED_TEXT[use]}. Convert the file to one of them.`,
    assetPath: path,
  };
}

/** The extension check: null when `path` has a format guaranteed for `use`. */
export function formatProblem(
  use: MediaUse,
  path: string,
): AssetProblem | null {
  const ext = extensionOf(path);
  const known = (FORMATS[use] as readonly string[]).includes(ext);
  if (known) return null;
  const what = ext === "" ? "has no file extension" : `is a ${ext} file`;
  return unsupported(
    use,
    path,
    `${what}, which is not a supported ${use} format`,
  );
}

/**
 * The codec check for a probed video or audio file: null when its streams are
 * guaranteed. The extension must already pass `formatProblem`.
 */
export function codecProblem(
  use: "video" | "audio",
  path: string,
  media: MediaProbe,
): AssetProblem | null {
  if (use === "audio") {
    if (media.videoCodec !== undefined) {
      return unsupported(
        use,
        path,
        "has a video stream, so it is not audio-only",
      );
    }
    if (
      media.audioCodec === undefined ||
      !media.audioCodec.startsWith("pcm_")
    ) {
      const codec = media.audioCodec ?? "none";
      return unsupported(use, path, `has audio codec "${codec}", not PCM`);
    }
    return null;
  }
  const rules = VIDEO_CODECS[extensionOf(path) as ".mp4" | ".webm"];
  if (media.videoCodec === undefined) {
    return unsupported(use, path, "has no video stream");
  }
  if (!rules.video.includes(media.videoCodec)) {
    return unsupported(
      use,
      path,
      `has video codec "${media.videoCodec}" in a ${extensionOf(path)} file`,
    );
  }
  if (
    media.audioCodec !== undefined &&
    !rules.audio.includes(media.audioCodec)
  ) {
    return unsupported(
      use,
      path,
      `has audio codec "${media.audioCodec}" in a ${extensionOf(path)} file`,
    );
  }
  return null;
}
