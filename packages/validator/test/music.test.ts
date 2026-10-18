// The project music track (task 045; ADR-0017), stage 3 and its timeline checks.
// A stub probe stands in for ffprobe, so no media file is read. Each case writes
// its own music file into a temporary project root.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveMusic, type MusicManifest } from "../src/stages/music.js";
import type { MediaProbe, ProbeResult } from "../src/media/probe.js";
import type { IrMusic } from "@quarto-video/ir";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "video-music-"));
  mkdirSync(join(root, "assets"));
  writeFileSync(join(root, "assets", "music.wav"), "not really audio");
  writeFileSync(join(root, "assets", "music.mp3"), "not really audio");
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** A probe result for a PCM WAV of `seconds` (or another codec when given). */
function wav(seconds: number, codec = "pcm_s16le"): ProbeResult {
  const media: MediaProbe = {
    kind: "audio",
    container: "wav",
    durationS: seconds,
    hasAudio: true,
    audioCodec: codec,
  };
  return { ok: true, media };
}

/** A 30 fps manifest with a timeline of `frames`, carrying `music`. */
function manifestOf(
  frames: number,
  music: Partial<IrMusic> = {},
): MusicManifest {
  return {
    settings: { fps: 30 },
    timeline: { durationFrames: frames },
    scenes: [{ source: { file: "index.qmd" } }],
    music: { src: "assets/music.wav", volume: 1, loop: false, ...music },
  };
}

const probeOf = (result: ProbeResult) => () => result;

describe("music track: the file", () => {
  it("accepts a PCM WAV and writes its length in frames (30 fps, rounded)", () => {
    const out = resolveMusic(manifestOf(150, { loop: true }), root, {
      probe: probeOf(wav(1.2345)),
      cacheFile: join(root, "cache.json"),
    });
    expect(out.diagnostics).toEqual([]);
    expect(out.ir.music?.lengthFrames).toBe(37);
  });

  it("rejects a file that is not a .wav (E_MEDIA_FORMAT, before any probe)", () => {
    const out = resolveMusic(
      manifestOf(150, { src: "assets/music.mp3" }),
      root,
      { probe: probeOf(wav(5)), cacheFile: join(root, "cache.json") },
    );
    expect(out.diagnostics.map((d) => [d.code, d.assetPath])).toEqual([
      ["E_MEDIA_FORMAT", "assets/music.mp3"],
    ]);
  });

  it("rejects a .wav that is not PCM (E_MEDIA_FORMAT from the probe)", () => {
    const out = resolveMusic(manifestOf(150, { loop: true }), root, {
      probe: probeOf(wav(5, "mp3")),
      cacheFile: join(root, "cache.json"),
    });
    expect(out.diagnostics.map((d) => d.code)).toEqual(["E_MEDIA_FORMAT"]);
  });

  it("reports an unreadable file (E_MEDIA_UNREADABLE)", () => {
    const out = resolveMusic(manifestOf(150, { loop: true }), root, {
      probe: probeOf({ ok: false, reason: "ffprobe failed" }),
      cacheFile: join(root, "cache.json"),
    });
    expect(out.diagnostics.map((d) => d.code)).toEqual(["E_MEDIA_UNREADABLE"]);
  });

  it("reports a missing file (E_ASSET_MISSING)", () => {
    const out = resolveMusic(
      manifestOf(150, { src: "assets/gone.wav" }),
      root,
      { probe: probeOf(wav(5)), cacheFile: join(root, "cache.json") },
    );
    expect(out.diagnostics.map((d) => d.code)).toEqual(["E_ASSET_MISSING"]);
  });

  it("refuses a path that leaves the project root (E_ASSET_ESCAPE, ADR-0006)", () => {
    const out = resolveMusic(manifestOf(150, { src: "../music.wav" }), root, {
      probe: probeOf(wav(5)),
      cacheFile: join(root, "cache.json"),
    });
    expect(out.diagnostics.map((d) => d.code)).toEqual(["E_ASSET_ESCAPE"]);
  });

  it("leaves a manifest with no track untouched, without probing", () => {
    const manifest: MusicManifest = {
      settings: { fps: 30 },
      timeline: { durationFrames: 150 },
    };
    const out = resolveMusic(manifest, root, {
      probe: () => {
        throw new Error("no probe expected");
      },
      cacheFile: join(root, "cache.json"),
    });
    expect(out.diagnostics).toEqual([]);
    expect(out.ir).toBe(manifest);
  });
});

describe("music track: length against the video", () => {
  it("is E_MUSIC_SHORT when the file is shorter than the video and does not loop", () => {
    const out = resolveMusic(manifestOf(150), root, {
      probe: probeOf(wav(1.5)),
      cacheFile: join(root, "cache.json"),
    });
    expect(out.diagnostics).toHaveLength(1);
    expect(out.diagnostics[0]).toMatchObject({
      code: "E_MUSIC_SHORT",
      property: "audio.music.loop",
      file: "index.qmd",
    });
    expect(out.diagnostics[0]?.message).toContain("45 frames long");
    expect(out.diagnostics[0]?.message).toContain("150 frames");
  });

  it("accepts a short file that loops (each pass lengthFrames long)", () => {
    const out = resolveMusic(manifestOf(150, { loop: true }), root, {
      probe: probeOf(wav(1.5)),
      cacheFile: join(root, "cache.json"),
    });
    expect(out.diagnostics).toEqual([]);
    expect(out.ir.music?.lengthFrames).toBe(45);
  });

  it("accepts a file exactly as long as the video, without loop", () => {
    const out = resolveMusic(manifestOf(150), root, {
      probe: probeOf(wav(5)),
      cacheFile: join(root, "cache.json"),
    });
    expect(out.diagnostics).toEqual([]);
  });

  it("accepts a longer file without loop: it is cut at the video's end", () => {
    const out = resolveMusic(manifestOf(150), root, {
      probe: probeOf(wav(9)),
      cacheFile: join(root, "cache.json"),
    });
    expect(out.diagnostics).toEqual([]);
    expect(out.ir.music?.lengthFrames).toBe(270);
  });

  it("is E_MUSIC_SHORT for a file under one frame, even when it loops", () => {
    const out = resolveMusic(manifestOf(150, { loop: true }), root, {
      probe: probeOf(wav(0.01)),
      cacheFile: join(root, "cache.json"),
    });
    expect(out.diagnostics.map((d) => d.code)).toEqual(["E_MUSIC_SHORT"]);
    expect(out.diagnostics[0]?.message).toContain("shorter than one frame");
  });

  it("is E_MUSIC_FADE when the fade-out is longer than the video", () => {
    const out = resolveMusic(
      manifestOf(150, { loop: true, fadeOutFrames: 151 }),
      root,
      { probe: probeOf(wav(5)), cacheFile: join(root, "cache.json") },
    );
    expect(out.diagnostics.map((d) => [d.code, d.property])).toEqual([
      ["E_MUSIC_FADE", "audio.music.fadeOut"],
    ]);
  });

  it("accepts a fade-out as long as the video", () => {
    const out = resolveMusic(
      manifestOf(150, { loop: true, fadeOutFrames: 150 }),
      root,
      { probe: probeOf(wav(5)), cacheFile: join(root, "cache.json") },
    );
    expect(out.diagnostics).toEqual([]);
  });
});
