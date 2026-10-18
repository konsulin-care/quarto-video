// Background footage (task 039; PRD §6.1, §6.2) on the background-video projects.
// Frame N of a scene shows the source frame its validated range gives it: trim
// at playbackRate, loop and freeze. The fixture footage shows its own index in
// eight bits (tests/fixtures/media/generate.sh), read here from the still of
// frame N. The render is muted: its MP4 has no audio stream. Needs a Chromium
// headless shell (QV_BROWSER_EXECUTABLE) and the generated clips.
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { renderStills } from "../../renderer/remotion/src/still.js";
import { findBrowser, projectIr } from "../visual/harness.js";
import { readPng, type Rgb } from "../visual/png.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN = join(ROOT, "packages", "cli", "bin", "video.mjs");
const SCRATCH = mkdtempSync(join(tmpdir(), "video-background-"));
const browser = findBrowser();

/** The frame counter: bit k is the k-th 40 px column of the top band (white = 1). */
function counterOf(image: Rgb): number {
  let value = 0;
  for (let bit = 0; bit < 8; bit++) {
    const x = bit * 40 + 20;
    const i = (20 * image.width + x) * 3;
    const luma =
      ((image.data[i] ?? 0) +
        (image.data[i + 1] ?? 0) +
        (image.data[i + 2] ?? 0)) /
      3;
    // The scrim leaves white near 137 and black near 10.
    if (luma > 70) value += 2 ** bit;
  }
  return value;
}

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

/** Renders the frames of one project and returns each frame's counter. */
async function countersOf(project: string, frames: number[]) {
  const scratch = mkdtempSync(join(SCRATCH, "still-"));
  const irPath = await projectIr(
    ROOT,
    `tests/fixtures/projects/${project}`,
    scratch,
  );
  const outDir = join(scratch, "stills");
  const files = await renderStills(irPath, outDir, {
    frames,
    browserExecutable: browser,
    assetRoot: join(scratch, "project"),
  });
  const counters: number[] = [];
  for (const file of files) counters.push(counterOf(await readPng(file)));
  return counters;
}

before(() => {
  execFileSync(
    "bash",
    [join(ROOT, "tests", "fixtures", "media", "generate.sh")],
    {
      stdio: "ignore",
    },
  );
});

after(() => {
  rmSync(SCRATCH, { recursive: true, force: true });
});

describe("background footage frames", () => {
  it("trims at playbackRate: frame N shows source start + N x 2", async () => {
    const frames = [0, 1, 22, 44];
    const counters = await countersOf("background-video", frames);
    assert.deepEqual(
      counters,
      frames.map((n) => 30 + 2 * n),
    );
  });

  it("loops the source range at normal speed", async () => {
    const frames = [0, 29, 30, 59, 60, 89];
    const counters = await countersOf("background-video-loop", frames);
    assert.deepEqual(
      counters,
      frames.map((n) => 30 + (n % 30)),
    );
  });

  it("freezes on the last frame of the range once the footage ends", async () => {
    const frames = [0, 29, 30, 59];
    const counters = await countersOf("background-video-freeze", frames);
    assert.deepEqual(
      counters,
      frames.map((n) => 60 + Math.min(n, 29)),
    );
  });
});

describe("muted background footage", () => {
  it("renders an MP4 with no audio stream from footage that has one", () => {
    const scratch = mkdtempSync(join(SCRATCH, "render-"));
    const project = join(scratch, "project");
    cpSync(
      join(ROOT, "tests", "fixtures", "projects", "background-video"),
      project,
      { recursive: true },
    );
    assert.deepEqual(streamsOf(join(project, "assets", "clip.mp4")), [
      "video",
      "audio",
    ]);
    const run = spawnSync(process.execPath, [BIN, "render", project], {
      encoding: "utf8",
      env: { ...process.env, QV_BROWSER_EXECUTABLE: browser },
    });
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual(streamsOf(join(project, "output.mp4")), ["video"]);
  });
});
