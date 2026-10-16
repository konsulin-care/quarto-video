// The media probe cache (ADR-0008): `.video-build/media.json` in the project
// root, keyed by the project-relative path. An entry is valid while the file's
// size and modification time are unchanged. A cache that cannot be read, or has
// another version, counts as empty; one that cannot be written is skipped. Neither
// changes what validation reports: the cache only saves ffprobe runs.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { MediaProbe } from "./probe.js";

export const CACHE_VERSION = 1;

interface CacheEntry {
  size: number;
  mtimeMs: number;
  media: MediaProbe;
}

export interface MediaCache {
  version: typeof CACHE_VERSION;
  files: Record<string, CacheEntry>;
}

export function emptyCache(): MediaCache {
  return { version: CACHE_VERSION, files: {} };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reads the cache file; any problem with it gives an empty cache. */
export function readCache(file: string): MediaCache {
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return emptyCache();
  }
  if (!isRecord(json) || json["version"] !== CACHE_VERSION) return emptyCache();
  if (!isRecord(json["files"])) return emptyCache();
  const files: Record<string, CacheEntry> = {};
  for (const [key, entry] of Object.entries(json["files"])) {
    if (
      isRecord(entry) &&
      typeof entry["size"] === "number" &&
      typeof entry["mtimeMs"] === "number" &&
      isRecord(entry["media"])
    ) {
      files[key] = {
        size: entry["size"],
        mtimeMs: entry["mtimeMs"],
        media: entry["media"] as unknown as MediaProbe,
      };
    }
  }
  return { version: CACHE_VERSION, files };
}

/** The cached probe of `key`, or undefined when there is no entry for this size and mtime. */
export function lookup(
  cache: MediaCache,
  key: string,
  size: number,
  mtimeMs: number,
): MediaProbe | undefined {
  const entry = cache.files[key];
  if (entry === undefined) return undefined;
  return entry.size === size && entry.mtimeMs === mtimeMs
    ? entry.media
    : undefined;
}

/** Records a probe of `key` in the cache object (not yet written). */
export function store(
  cache: MediaCache,
  key: string,
  size: number,
  mtimeMs: number,
  media: MediaProbe,
): void {
  cache.files[key] = { size, mtimeMs, media };
}

/** Writes the cache atomically (temp file, then rename). A failure is ignored. */
export function writeCache(file: string, cache: MediaCache): void {
  try {
    mkdirSync(dirname(file), { recursive: true });
    const temp = `${file}.tmp`;
    writeFileSync(temp, `${JSON.stringify(cache, null, 2)}\n`);
    renameSync(temp, file);
  } catch {
    // The cache only saves probes; a read-only project still validates.
  }
}
