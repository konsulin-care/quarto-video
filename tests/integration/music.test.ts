// The project music track (task 045; PRD §7.2; ADR-0017) through the real `video`
// CLI. music-loop: a 1.5 s 450 Hz track loops under a 5 s video and fades out over
// its last second. music-with-keep: the track plays under a kept 1 kHz clip, so
// both tones are in its first scene and only the track is in the second.
// music-short-error: a track without loop shorter than the video is E_MUSIC_SHORT.
// Levels come from the decoded PCM: a Goertzel amplitude at one frequency over a
// window, and a per-frame RMS. Needs a Chromium headless shell (QV_BROWSER_EXECUTABLE)
// and the generated clips (tests/fixtures/media/generate.sh).
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { findBrowser } from "../visual/harness.js";
import { decodeMono, goertzelDb, rmsDb, SAMPLE_RATE } from "./audio-pcm.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN = join(ROOT, "packages", "cli", "bin", "video.mjs");
const SCRATCH = mkdtempSync(join(tmpdir(), "video-music-"));
const browser = findBrowser();
const FPS = 30;
// The track is a sine of amplitude 1/8 (peak -18.06 dB). music-loop plays it at 0.5,
// music-with-keep at 0.25 (-30.1 dB); AAC adds at most about 0.5 dB.
const TRACK_FULL_DB = -18.06;
const TRACK_HALF_DB = TRACK_FULL_DB - 6.02;
const TRACK_QUARTER_DB = TRACK_FULL_DB - 12.04;
const TONE_KEPT_DB = -18.06;

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

/** The duration in seconds of the first stream of `type` (ffprobe). */
function streamSeconds(file: string, type: "video" | "audio"): number {
  const run = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      type === "video" ? "v:0" : "a:0",
      "-show_entries",
      "stream=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      file,
    ],
    { encoding: "utf8" },
  );
  const seconds = Number(run.stdout.trim());
  assert.ok(Number.isFinite(seconds), `no ${type} duration for ${file}`);
  return seconds;
}

/** The sample index of a time in seconds. */
const at = (seconds: number) => Math.round(seconds * SAMPLE_RATE);

/** The per-frame RMS, in dB, of timeline frames `first` to `last` (inclusive). */
/** The RMS level, in dB, of `frames` frames from `first` (a window of whole frames). */
function windowDb(pcm: Float32Array, first: number, frames: number): number {
  const size = SAMPLE_RATE / FPS;
  return rmsDb(pcm, Math.round(first * size), Math.round(frames * size));
}

/**
 * The expected level, in dB relative to the steady level, of a window of `frames` frames
 * from `first`: the fade's gain (149-f)/30 (ADR-0017, volume times (T-f-1)/N), in power.
 */
function expectedWindowDb(first: number, frames: number): number {
  let power = 0;
  for (let f = first; f < first + frames; f++) {
    const gain = Math.max(149 - f, 0) / 30;
    power += gain * gain;
  }
  return 10 * Math.log10(power / frames);
}

function frameLevels(pcm: Float32Array, first: number, last: number): number[] {
  const size = SAMPLE_RATE / FPS;
  const levels: number[] = [];
  for (let frame = first; frame <= last; frame++) {
    levels.push(rmsDb(pcm, Math.round(frame * size), Math.round(size)));
  }
  return levels;
}

let loopOutput = "";
let keepOutput = "";

before(() => {
  execFileSync(
    "bash",
    [join(ROOT, "tests", "fixtures", "media", "generate.sh")],
    { stdio: "ignore" },
  );
  loopOutput = render("music-loop");
  keepOutput = render("music-with-keep");
});

after(() => {
  rmSync(SCRATCH, { recursive: true, force: true });
});

describe("project music track", () => {
  it("lasts as long as the video: the audio ends with the last frame", () => {
    const video = streamSeconds(loopOutput, "video");
    const audio = streamSeconds(loopOutput, "audio");
    assert.ok(
      Math.abs(audio - video) <= 1 / FPS,
      `audio ${audio} s, video ${video} s: they differ by more than one frame`,
    );
  });

  it("starts on frame 0 and repeats the track in each pass", () => {
    const pcm = decodeMono(loopOutput);
    // The first audible sample sits at frame 0, within 64 samples (1.5 ms): the stitch
    // moves the encoder's 2048-sample delay out (exact-length.ts; measured index 1).
    let onset = 0;
    while (onset < pcm.length && Math.abs(pcm[onset] ?? 0) < 1e-3) onset++;
    assert.ok(onset <= 64, `the track starts ${onset} samples after frame 0`);
    // Pass starts (1.5 s each): 0, 1.5, 3.0 and 4.5 s. Windows sit inside each pass.
    for (const [from, to] of [
      [0.0, 0.5],
      [1.6, 2.9],
      [3.1, 3.9],
    ] as const) {
      const level = goertzelDb(pcm, at(from), at(to) - at(from), 450);
      assert.ok(
        Math.abs(level - TRACK_HALF_DB) <= 1,
        `450 Hz in ${from}-${to} s at ${level} dB, expected ${TRACK_HALF_DB} dB +-1`,
      );
    }
  });

  it("fades out over the last 30 frames: three-frame levels fall along the gain curve to silence", () => {
    const pcm = decodeMono(loopOutput);
    const steady = frameLevels(pcm, 100, 110);
    const fade = frameLevels(pcm, 120, 149);
    const spread = Math.max(...steady) - Math.min(...steady);
    assert.ok(spread <= 0.5, `steady before the fade varies by ${spread} dB`);
    // Per-frame levels are not monotone: the encoder's gain steps land on 1024-sample
    // AAC blocks, about 0.64 frame (ADR-0017). So the fade is read in windows of three
    // frames (4410 samples, four blocks). Measured on the aligned render: every window
    // falls (the largest rise is -0.68 dB, the window starting at 123 against 120).
    // Windows are checked to 0.5 dB, which is well above that margin and far below
    // the 0.3 to 3 dB steps of the fade. The curve match stops at the window starting at
    // 141: after that the expected slope passes 3 dB a frame and the measured tail lags
    // by about two frames (the fit in ADR-0017), so the match would test that timing
    // rather than the fade. The tail still falls in the monotone check and must reach silence.
    const WINDOW = 3;
    const windows: number[] = [];
    for (let first = 120; first + WINDOW <= 150; first += WINDOW) {
      windows.push(windowDb(pcm, first, WINDOW));
    }
    for (let k = 1; k < windows.length; k++) {
      assert.ok(
        (windows[k] as number) <= (windows[k - 1] as number) + 0.5,
        `window ${120 + k * WINDOW} at ${windows[k]} dB rises over window ${120 + (k - 1) * WINDOW} at ${windows[k - 1]} dB`,
      );
    }
    const base = steady.reduce((sum, level) => sum + level, 0) / steady.length;
    const matched = windows.slice(0, 8); // windows starting at 120 to 141
    matched.forEach((level, k) => {
      const first = 120 + k * WINDOW;
      const expected = base + expectedWindowDb(first, WINDOW);
      assert.ok(
        Math.abs(level - expected) <= 1,
        `window ${first} at ${level} dB, expected ${expected} dB along the gain curve +-1`,
      );
    });
    // The total drop from the first window to the last matched one is the fade's depth.
    const drop =
      (matched[0] as number) - (matched[matched.length - 1] as number);
    const expectedDrop =
      expectedWindowDb(120, WINDOW) - expectedWindowDb(141, WINDOW);
    assert.ok(
      Math.abs(drop - expectedDrop) <= 1,
      `the fade drops ${drop} dB over windows 120 to 141, expected ${expectedDrop} dB +-1`,
    );
    assert.ok(
      (fade[fade.length - 1] as number) <= (steady[0] as number) - 40,
      `the last frame at ${fade[fade.length - 1]} dB is not near silence`,
    );
  });
});

describe("project music track with kept footage", () => {
  it("plays the clip's 1 kHz tone and the track together in the clip's scene", () => {
    const pcm = decodeMono(keepOutput);
    const tone = goertzelDb(pcm, at(0.5), at(1.5) - at(0.5), 1000);
    const track = goertzelDb(pcm, at(0.5), at(1.5) - at(0.5), 450);
    assert.ok(
      Math.abs(tone - TONE_KEPT_DB) <= 1,
      `1 kHz at ${tone} dB, expected ${TONE_KEPT_DB} dB +-1`,
    );
    assert.ok(
      Math.abs(track - TRACK_QUARTER_DB) <= 1,
      `450 Hz at ${track} dB, expected ${TRACK_QUARTER_DB} dB +-1`,
    );
  });

  it("plays only the track in the second scene", () => {
    const pcm = decodeMono(keepOutput);
    const track = goertzelDb(pcm, at(2.5), at(3.5) - at(2.5), 450);
    const tone = goertzelDb(pcm, at(2.5), at(3.5) - at(2.5), 1000);
    assert.ok(
      Math.abs(track - TRACK_QUARTER_DB) <= 1,
      `450 Hz at ${track} dB, expected ${TRACK_QUARTER_DB} dB +-1`,
    );
    assert.ok(
      tone <= -40,
      `1 kHz at ${tone} dB after the clip: expected silence`,
    );
  });
});

describe("project music track that is too short", () => {
  it("is E_MUSIC_SHORT and names the track without loop", () => {
    const copy = join(
      mkdtempSync(join(SCRATCH, "short-")),
      "music-short-error",
    );
    cpSync(
      join(ROOT, "tests", "fixtures", "projects", "music-short-error"),
      copy,
      { recursive: true },
    );
    const run = spawnSync(process.execPath, [BIN, "validate", copy, "--json"], {
      encoding: "utf8",
    });
    assert.equal(run.status, 1);
    const diagnostics = JSON.parse(run.stdout) as {
      code: string;
      property?: string;
    }[];
    assert.deepEqual(
      diagnostics.map((d) => [d.code, d.property]),
      [["E_MUSIC_SHORT", "audio.music.loop"]],
    );
  });
});
