// Source audio (task 044; PRD §7.2; ADR-0009) through the real `video` CLI. The
// audio-mute project has no audio stream; audio-keep plays its 1 kHz tone (stereo,
// -18 dBFS peak) in its middle scene only; audio-keep-fade fades the tone in over
// its transition; audio-keep-silent-source is E_AUDIO_NO_STREAM. Levels are read
// with ffmpeg volumedetect over windows inside each scene. Needs a Chromium
// headless shell (QV_BROWSER_EXECUTABLE) and the generated clips.
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { findBrowser } from "../visual/harness.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN = join(ROOT, "packages", "cli", "bin", "video.mjs");
const SCRATCH = mkdtempSync(join(tmpdir(), "video-audio-"));
const browser = findBrowser();
// A full-scale sine of amplitude 1/8 peaks at -18.06 dB; AAC adds at most ~0.5 dB.
const TONE_DB = -18.06;

/** The codec type of each stream of a media file (ffprobe). */
function streamTypes(file: string): string[] {
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
  return run.stdout
    .trim()
    .split("\n")
    .filter((line) => line !== "");
}

/** The peak level in dB of the audio from `start` seconds for `length` seconds (ffmpeg volumedetect). */
function peakDb(file: string, start: number, length: number): number {
  const run = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-nostats",
      "-ss",
      String(start),
      "-t",
      String(length),
      "-i",
      file,
      "-vn",
      "-af",
      "volumedetect",
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" },
  );
  const match = /max_volume: (-?[\d.]+) dB/.exec(run.stderr);
  assert.ok(match, `no volumedetect output for ${file}`);
  return Number(match[1]);
}

/** Copies a fixture project to the scratch directory and renders it through the CLI. */
function render(project: string): string {
  const copy = join(mkdtempSync(join(SCRATCH, "run-")), project);
  cpSync(join(ROOT, "tests", "fixtures", "projects", project), copy, {
    recursive: true,
  });
  const run = spawnSync(process.execPath, [BIN, "render", copy], {
    encoding: "utf8",
    env: { ...process.env, QV_BROWSER_EXECUTABLE: browser },
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(run.status, 0, `render ${project}: ${run.stderr}`);
  return join(copy, "output.mp4");
}

before(() => {
  execFileSync(
    "bash",
    [join(ROOT, "tests", "fixtures", "media", "generate.sh")],
    { stdio: "ignore" },
  );
});

after(() => {
  rmSync(SCRATCH, { recursive: true, force: true });
});

describe("muted source audio", () => {
  it("renders with no audio stream at all", () => {
    const output = render("audio-mute");
    assert.deepEqual(streamTypes(output), ["video"]);
  });
});

describe("kept source audio", () => {
  it("plays the tone at its level in its scene and is silent around it", () => {
    const output = render("audio-keep");
    assert.ok(
      streamTypes(output).includes("audio"),
      "the output has an audio stream",
    );
    assert.ok(
      peakDb(output, 0.1, 1.8) <= -90,
      "the scene before the clip is silent",
    );
    const inside = peakDb(output, 2.1, 1.8);
    assert.ok(
      Math.abs(inside - TONE_DB) <= 1,
      `tone at ${inside} dB, expected ${TONE_DB} dB +-1`,
    );
    assert.ok(
      peakDb(output, 4.1, 1.8) <= -90,
      "the scene after the clip is silent",
    );
  });

  it("fades the tone in over a transition: quiet at the overlap's start, full at its end", () => {
    const output = render("audio-keep-fade");
    const early = peakDb(output, 3.0, 0.1);
    const middle = peakDb(output, 3.5, 0.1);
    const full = peakDb(output, 4.2, 0.1);
    assert.ok(
      early < middle - 10,
      `early ${early} dB should be well below the middle ${middle} dB`,
    );
    assert.ok(
      middle < full - 3,
      `middle ${middle} dB should be below the full level ${full} dB`,
    );
    assert.ok(
      Math.abs(full - TONE_DB) <= 1,
      `full level ${full} dB, expected ${TONE_DB} dB +-1`,
    );
  });
});

describe("kept source audio without a stream", () => {
  it("is E_AUDIO_NO_STREAM and names the file", () => {
    const copy = join(
      mkdtempSync(join(SCRATCH, "silent-")),
      "audio-keep-silent-source",
    );
    cpSync(
      join(ROOT, "tests", "fixtures", "projects", "audio-keep-silent-source"),
      copy,
      { recursive: true },
    );
    const run = spawnSync(process.execPath, [BIN, "validate", copy, "--json"], {
      encoding: "utf8",
    });
    assert.equal(run.status, 1);
    const diagnostics = JSON.parse(run.stdout) as {
      code: string;
      assetPath?: string;
    }[];
    assert.deepEqual(
      diagnostics.map((d) => [d.code, d.assetPath]),
      [["E_AUDIO_NO_STREAM", "assets/silent.mp4"]],
    );
  });
});
