// Stage 3 media check (ADR-0008) for one video or audio reference that already
// resolves inside the root. The probe result is read from the cache when the
// file's size and mtime match; otherwise the file is probed and the result is
// cached. A file that cannot be probed is E_MEDIA_UNREADABLE; one whose streams
// are outside the guaranteed set is E_MEDIA_FORMAT.
import { statSync } from "node:fs";
import { join } from "node:path";
import type { AssetProblem } from "../assets/syntax.js";
import { codecProblem } from "../media/formats.js";
import { lookup, readCache, store, writeCache } from "../media/cache.js";
import { probeFile, type Prober } from "../media/probe.js";

/** Stage 3 media options: the probe (ffprobe by default) and the cache file (absolute). */
export interface MediaOptions {
  /** Reads a file; a spy in tests. Default: ffprobe (`probeFile`). */
  probe?: Prober;
  /** Absolute cache path. Default: `<root>/.video-build/media.json`. */
  cacheFile?: string;
}

function unreadable(path: string, reason: string): AssetProblem {
  return {
    ok: false,
    code: "E_MEDIA_UNREADABLE",
    message: `Asset "${path}" could not be read as media (${reason}).`,
    suggestion:
      "Check that the file is a complete, undamaged video or audio file, and that ffprobe is installed (`npx video doctor`).",
    assetPath: path,
  };
}

/** The problem with a video or audio file at `path` (project-relative), or null when it is supported. */
export function mediaProblem(
  use: "video" | "audio",
  path: string,
  root: string,
  options: MediaOptions = {},
): AssetProblem | null {
  const absolute = join(root, path);
  const cacheFile =
    options.cacheFile ?? join(root, ".video-build", "media.json");
  let size: number;
  let mtimeMs: number;
  try {
    const info = statSync(absolute);
    size = info.size;
    mtimeMs = info.mtimeMs;
  } catch {
    return unreadable(path, "the file cannot be inspected");
  }
  const cache = readCache(cacheFile);
  let media = lookup(cache, path, size, mtimeMs);
  if (media === undefined) {
    const result = (options.probe ?? probeFile)(absolute);
    if (!result.ok) return unreadable(path, result.reason);
    media = result.media;
    store(cache, path, size, mtimeMs, media);
    writeCache(cacheFile, cache);
  }
  return codecProblem(use, path, media);
}
