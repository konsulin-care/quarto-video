// Source audio of a `.video` block (task 044; ADR-0009). A kept clip needs an
// audio stream in its file: without one it is E_AUDIO_NO_STREAM, and a muted clip
// is never checked. The probe is a stub, so no ffprobe runs.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  assetRefsOf,
  checkAssets,
  type AssetRef,
  type RefIr,
} from "../src/stages/assets.js";
import type { MediaProbe, Prober } from "../src/media/probe.js";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "video-audio-"));
  mkdirSync(join(root, "assets"));
  writeFileSync(join(root, "assets", "clip.mp4"), "not really a video");
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** A probe of a 2 s, 30 fps file with (or without) an audio stream. */
function probeWith(hasAudio: boolean): Prober {
  const media: MediaProbe = {
    kind: "video",
    container: "mov,mp4,m4a,3gp,3g2,mj2",
    durationS: 2,
    width: 640,
    height: 360,
    fps: 30,
    videoCodec: "h264",
    hasAudio,
    ...(hasAudio ? { audioCodec: "aac" } : {}),
  };
  return () => ({ ok: true, media });
}

function refOf(keepAudio: boolean | undefined): AssetRef {
  return {
    path: "assets/clip.mp4",
    sceneId: "scene-001",
    file: "index.qmd",
    line: 3,
    use: "video",
    ...(keepAudio === undefined ? {} : { keepAudio }),
    range: {
      fps: 30,
      durationFrames: 60,
      sourceStartFrames: 0,
      loop: false,
      freeze: false,
      playbackRate: 1,
    },
  };
}

function check(ref: AssetRef, hasAudio: boolean) {
  return checkAssets([ref], root, {
    probe: probeWith(hasAudio),
    cacheFile: join(root, ".video-build", "media.json"),
  });
}

describe("keep on a source without audio", () => {
  it("is E_AUDIO_NO_STREAM, naming the file and its scene", () => {
    const [diagnostic] = check(refOf(true), false);
    expect(diagnostic?.code).toBe("E_AUDIO_NO_STREAM");
    expect(diagnostic?.assetPath).toBe("assets/clip.mp4");
    expect(diagnostic?.sceneId).toBe("scene-001");
    expect(diagnostic?.line).toBe(3);
  });

  it("never prints the absolute path of the project", () => {
    const [diagnostic] = check(refOf(true), false);
    expect(diagnostic?.message).not.toContain(root);
    expect(diagnostic?.suggestion).toContain('audio="mute"');
  });

  it("is not reported when the file has an audio stream", () => {
    expect(check(refOf(true), true)).toEqual([]);
  });
});

describe("mute never checks the audio stream", () => {
  it("is not an error for a source without audio", () => {
    expect(check(refOf(false), false)).toEqual([]);
    expect(check(refOf(undefined), false)).toEqual([]);
  });
});

describe("the reference carries the policy from the IR", () => {
  const scene = (audio: "mute" | "keep") => ({
    id: "scene-001",
    component: "title",
    durationFrames: 60,
    source: { file: "index.qmd", line: 1 },
    content: { slots: {} },
    media: [
      {
        type: "video" as const,
        src: "assets/clip.mp4",
        placement: "background" as const,
        fit: "contain" as const,
        sourceStartFrames: 0,
        audio,
        loop: false,
        freeze: false,
        playbackRate: 1,
        alt: "",
        ...(audio === "keep" ? { volume: 1 } : {}),
      },
    ],
  });

  it("marks a kept block keepAudio and a muted block not", () => {
    const ir = {
      settings: { fps: 30 },
      scenes: [scene("keep")],
    } as unknown as RefIr;
    const muted = {
      settings: { fps: 30 },
      scenes: [scene("mute")],
    } as unknown as RefIr;
    expect(assetRefsOf(ir)[0]?.keepAudio).toBe(true);
    expect(assetRefsOf(muted)[0]?.keepAudio).toBe(false);
  });
});
