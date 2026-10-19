// Stage 3 media references (ADR-0008): a video or audio reference is probed
// once and then read from `.video-build/media.json` while its size and mtime
// are unchanged. An unsupported format is never probed. A damaged file is
// E_MEDIA_UNREADABLE, not a crash.
import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  probeFile,
  type MediaOptions,
  type MediaProbe,
  type Prober,
} from "../src/index.js";
import { checkAssets, type AssetRef } from "../src/stages/assets.js";

const MEDIA = fileURLToPath(
  new URL("../../../tests/fixtures/media/", import.meta.url),
);
const AVI = fileURLToPath(
  new URL(
    "../../../tests/fixtures/projects/media-unsupported/assets/clip.avi",
    import.meta.url,
  ),
);
const SCRATCH = mkdtempSync(join(tmpdir(), "media-stage-"));

/** A fresh project root with the named media fixtures copied into assets/. */
function project(name: string, files: string[]): string {
  const root = mkdtempSync(join(SCRATCH, `${name}-`));
  mkdirSync(join(root, "assets"));
  for (const file of files) {
    copyFileSync(join(MEDIA, "out", file), join(root, "assets", file));
  }
  return root;
}

function ref(path: string, use: "image" | "video" | "audio"): AssetRef {
  return { path, sceneId: "scene-001", file: "index.qmd", use };
}

/** A spy over the real ffprobe: counts the files it is asked to read. */
function spyProbe(): { probe: Prober; calls: string[] } {
  const calls: string[] = [];
  const probe: Prober = (file) => {
    calls.push(file);
    return probeFile(file);
  };
  return { probe, calls };
}

beforeAll(() => {
  execFileSync("bash", [join(MEDIA, "generate.sh")], { stdio: "ignore" });
}, 120_000); // generate.sh encodes several clips; two suites run it in parallel.

afterAll(() => rmSync(SCRATCH, { recursive: true, force: true }));

describe("checkAssets: media probe and cache", () => {
  it("probes a valid video once and reads the second validation from the cache", () => {
    const root = project("cache", ["clip-2s-audio.mp4"]);
    const spy = spyProbe();
    const options: MediaOptions = { probe: spy.probe };
    const refs = [ref("assets/clip-2s-audio.mp4", "video")];

    expect(checkAssets(refs, root, options)).toEqual([]);
    expect(checkAssets(refs, root, options)).toEqual([]);

    expect(spy.calls).toHaveLength(1);
    const cache = JSON.parse(
      readFileSync(join(root, ".video-build", "media.json"), "utf8"),
    ) as { version: number; files: Record<string, { media: MediaProbe }> };
    expect(cache.version).toBe(1);
    expect(cache.files["assets/clip-2s-audio.mp4"]?.media).toMatchObject({
      kind: "video",
      fps: 30,
    });
  });

  it("probes again when the file changes size or mtime", () => {
    const root = project("changed", ["tone-2s.wav"]);
    const spy = spyProbe();
    const options: MediaOptions = { probe: spy.probe };
    const refs = [ref("assets/tone-2s.wav", "audio")];

    checkAssets(refs, root, options);
    appendFileSync(join(root, "assets", "tone-2s.wav"), Buffer.alloc(8));
    checkAssets(refs, root, options);

    expect(spy.calls).toHaveLength(2);
  });

  it("treats an unreadable cache file as empty and still validates", () => {
    const root = project("badcache", ["tone-2s.wav"]);
    mkdirSync(join(root, ".video-build"));
    writeFileSync(join(root, ".video-build", "media.json"), "{ not json");
    const spy = spyProbe();

    const found = checkAssets([ref("assets/tone-2s.wav", "audio")], root, {
      probe: spy.probe,
    });

    expect(found).toEqual([]);
    expect(spy.calls).toHaveLength(1);
  });

  it("never probes a file whose extension is not a guaranteed format", () => {
    const root = project("avi", []);
    copyFileSync(AVI, join(root, "assets", "clip.avi"));
    const probe = vi.fn<Prober>(probeFile);

    const [diagnostic] = checkAssets([ref("assets/clip.avi", "video")], root, {
      probe,
    });

    expect(probe).not.toHaveBeenCalled();
    expect(diagnostic).toMatchObject({
      severity: "error",
      code: "E_MEDIA_FORMAT",
      assetPath: "assets/clip.avi",
      sceneId: "scene-001",
      file: "index.qmd",
    });
    expect(diagnostic?.suggestion).toContain(".mp4");
    expect(diagnostic?.suggestion).toContain(".webm");
  });

  it("reports a corrupt media file as E_MEDIA_UNREADABLE without crashing", () => {
    const root = project("corrupt", []);
    writeFileSync(join(root, "assets", "broken.mp4"), "not a video at all");

    const found = checkAssets([ref("assets/broken.mp4", "video")], root);

    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      severity: "error",
      code: "E_MEDIA_UNREADABLE",
      assetPath: "assets/broken.mp4",
    });
    expect(found[0]?.message).not.toContain(root);
  });

  it("reports a video codec outside the guaranteed set, from the probe", () => {
    const root = project("hevc", ["clip-2s-audio.mp4"]);
    const hevc: Prober = () => ({
      ok: true,
      media: {
        kind: "video",
        container: "mov,mp4,m4a,3gp,3g2,mj2",
        durationS: 2,
        width: 640,
        height: 360,
        fps: 30,
        videoCodec: "hevc",
        hasAudio: false,
      },
    });

    const [diagnostic] = checkAssets(
      [ref("assets/clip-2s-audio.mp4", "video")],
      root,
      {
        probe: hevc,
      },
    );

    expect(diagnostic).toMatchObject({
      code: "E_MEDIA_FORMAT",
      message: expect.stringContaining('"hevc"'),
    });
  });

  it("rejects a video reference to a file with no video stream", () => {
    const root = project("audio-as-video", ["tone-2s.wav"]);
    copyFileSync(
      join(MEDIA, "out", "tone-2s.wav"),
      join(root, "assets", "clip.mp4"),
    );

    const [diagnostic] = checkAssets([ref("assets/clip.mp4", "video")], root);

    expect(diagnostic).toMatchObject({
      code: "E_MEDIA_FORMAT",
      message:
        'Asset "assets/clip.mp4" has no video stream.\nReferenced by scene "scene-001".',
    });
  });
});
