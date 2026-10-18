// Framed image footage in the render (IR 1.10, ADR-0018; task 041 follow-up). A
// still is held for its scene: every frame of a scene draws the same picture, and
// the next scene draws another. The MP4 has no audio stream, since a still has no
// sound. Needs a Chromium headless shell (QV_BROWSER_EXECUTABLE).
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { renderStills } from "../../renderer/remotion/src/still.js";
import { findBrowser, projectIr } from "../visual/harness.js";
import { readPng } from "../visual/png.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN = join(ROOT, "packages", "cli", "bin", "video.mjs");
const SCRATCH = mkdtempSync(join(tmpdir(), "video-image-frames-"));
const FIXTURE = join(
  ROOT,
  "tests",
  "fixtures",
  "projects",
  "component-image-footage",
);
const browser = findBrowser();

after(() => rmSync(SCRATCH, { recursive: true, force: true }));

/** The codec type of each stream of a media file, in order (ffprobe). */
function streamsOf(file: string): string[] {
  const run = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "stream=codec_type",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      file,
    ],
    { encoding: "utf8" },
  );
  return run.stdout.trim().split("\n");
}

describe("framed image footage frames", () => {
  it("holds each still for its scene: frames of a scene are identical, scenes differ", async () => {
    const scratch = mkdtempSync(join(SCRATCH, "still-"));
    const irPath = await projectIr(
      ROOT,
      "tests/fixtures/projects/component-image-footage",
      scratch,
    );
    const frames = [0, 29, 59, 60, 119, 120, 179, 180, 239];
    const files = await renderStills(irPath, join(scratch, "stills"), {
      frames,
      browserExecutable: browser,
      assetRoot: join(scratch, "project"),
    });
    const pixels = new Map<number, Buffer>();
    for (const [index, file] of files.entries()) {
      const image = await readPng(file);
      pixels.set(frames[index] ?? -1, Buffer.from(image.data));
    }
    const same = (a: number, b: number) =>
      pixels.get(a)?.equals(pixels.get(b) ?? Buffer.alloc(0)) === true;
    assert.ok(same(0, 29), "scene 1: frame 0 and frame 29 match");
    assert.ok(same(0, 59), "scene 1: frame 0 and frame 59 match");
    assert.ok(same(60, 119), "scene 2 holds its still");
    assert.ok(same(120, 179), "scene 3 holds its still");
    assert.ok(same(180, 239), "scene 4 holds its still");
    assert.ok(!same(0, 60), "scene 1 and scene 2 show different stills");
    assert.ok(!same(60, 120), "scene 2 and scene 3 show different stills");
  });

  it("renders an MP4 with no audio stream", () => {
    const scratch = mkdtempSync(join(SCRATCH, "render-"));
    const project = join(scratch, "project");
    cpSync(FIXTURE, project, { recursive: true });
    const run = spawnSync(process.execPath, [BIN, "render", project], {
      encoding: "utf8",
      env: { ...process.env, QV_BROWSER_EXECUTABLE: browser },
    });
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual(streamsOf(join(project, "output.mp4")), ["video"]);
  });
});
