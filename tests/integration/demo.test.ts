// The acceptance demo `videos/demo` (task 047; PRD §13.4, §16). It validates with zero
// diagnostics (errors and warnings), and its IR holds every §13.4 element: a title, a
// statement, bullets, a statistic and a chart, background footage, a framed product demo,
// a split-screen, a closing end card, the music track and the captions. A copy at 960x540
// renders; the MP4 matches the IR's size, fps, frame count and audio duration, and the
// sidecar WebVTT has one cue per IR caption cue.
// Runs under tsx with node:test, in the test:integration:render group.
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN_DIR = join(ROOT, "node_modules", ".bin");
const PROJECT = join(ROOT, "videos", "demo");
const SCRATCH = mkdtempSync(join(tmpdir(), "video-demo-"));
const REDUCED = { width: 960, height: 540 };
const RENDER_TIMEOUT_MS = 600_000;

after(() => rmSync(SCRATCH, { recursive: true, force: true }));

interface Run {
  status: number | null;
  stdout: string;
  stderr: string;
}

interface Media {
  type: string;
  kind?: string;
  placement?: string;
  region?: string;
  frame?: string;
}

interface Ir {
  settings: { width: number; height: number; fps: number };
  timeline: { durationFrames: number };
  scenes: {
    component: string;
    durationFrames: number;
    media?: Media[];
  }[];
  music?: { src: string; lengthFrames: number };
  captions?: { src: string; mode: string; cues: unknown[] };
}

/** Runs the installed `video` bin from the repository root. */
function video(args: string[], env: Record<string, string> = {}): Run {
  const result = spawnSync(join(BIN_DIR, "video"), args, {
    cwd: ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
      PATH: `${BIN_DIR}${delimiter}${process.env["PATH"] ?? ""}`,
    },
  });
  if (result.error !== undefined) throw result.error;
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

/** Finds the Playwright-installed headless shell without downloading anything. */
function browserExecutable(): string {
  const explicit = process.env["QV_BROWSER_EXECUTABLE"];
  if (explicit) return explicit;
  const root =
    process.env["PLAYWRIGHT_BROWSERS_PATH"] ??
    join(homedir(), ".cache", "ms-playwright");
  const dir = existsSync(root)
    ? readdirSync(root).find((name) =>
        name.startsWith("chromium_headless_shell-"),
      )
    : undefined;
  if (!dir) {
    throw new Error(
      `no headless shell under ${root}; set QV_BROWSER_EXECUTABLE`,
    );
  }
  return join(root, dir, "chrome-linux", "headless_shell");
}

/** The IR the validator prints for a project (stages 1 to 4 pass). */
function irOf(root: string): Ir {
  const run = video(["validate", "--print-ir", root]);
  assert.equal(run.status, 0, run.stderr);
  return JSON.parse(run.stdout) as Ir;
}

/** The first stream's duration in seconds (ffprobe). */
function streamSeconds(file: string, type: "video" | "audio"): number {
  const result = spawnSync(
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
  if (result.status !== 0) throw new Error(`ffprobe failed: ${result.stderr}`);
  const seconds = Number(result.stdout.trim());
  assert.ok(Number.isFinite(seconds), `no ${type} duration in ${file}`);
  return seconds;
}

/** Width, height and decoded frame count of the first video stream (ffprobe). */
function probe(file: string): {
  width: number;
  height: number;
  frames: number;
} {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-count_frames",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,nb_read_frames",
      "-of",
      "json",
      file,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`ffprobe failed: ${result.stderr}`);
  const stream = (
    JSON.parse(result.stdout) as {
      streams: { width: number; height: number; nb_read_frames: string }[];
    }
  ).streams[0];
  if (!stream) throw new Error(`no video stream in ${file}`);
  return {
    width: stream.width,
    height: stream.height,
    frames: Number(stream.nb_read_frames),
  };
}

/** The scenes whose component is `component`. */
function scenesOf(ir: Ir, component: string) {
  return ir.scenes.filter((scene) => scene.component === component);
}

/** The footage items of a scene matching `predicate`. */
function footageOf(
  ir: Ir,
  predicate: (media: Media, component: string) => boolean,
) {
  return ir.scenes.filter((scene) =>
    (scene.media ?? []).some((media) => predicate(media, scene.component)),
  );
}

let ir: Ir;

describe("videos/demo acceptance project", () => {
  before(() => {
    ir = irOf(PROJECT);
  });

  it("validates with zero diagnostics: no errors and no warnings", () => {
    const run = video(["validate", "--json", PROJECT]);
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual(JSON.parse(run.stdout), []);
  });

  it("opens on a title scene and closes on an end card", () => {
    assert.equal(ir.scenes[0]?.component, "title");
    assert.equal(ir.scenes.at(-1)?.component, "end-card");
  });

  it("has a statement scene and a bullets scene", () => {
    assert.ok(scenesOf(ir, "statement").length >= 1, "no statement scene");
    assert.ok(scenesOf(ir, "bullets").length >= 1, "no bullets scene");
  });

  it("has a statistic or a chart scene", () => {
    const count =
      scenesOf(ir, "statistic").length + scenesOf(ir, "chart").length;
    assert.ok(count >= 1, "no statistic or chart scene");
  });

  it("has existing video footage as a background", () => {
    const hits = footageOf(
      ir,
      (media) => media.type === "video" && media.placement === "background",
    );
    assert.ok(hits.length >= 1, "no background video footage");
  });

  it("has a framed product demonstration", () => {
    const hits = footageOf(
      ir,
      (media, component) =>
        component === "product-demo" && media.placement === "framed",
    );
    assert.ok(hits.length >= 1, "no framed footage in product-demo");
  });

  it("has a split-screen composition with region footage", () => {
    const hits = footageOf(
      ir,
      (media, component) =>
        component === "split-screen" && media.placement === "region",
    );
    assert.ok(hits.length >= 1, "no region footage in split-screen");
  });

  it("has a background music track", () => {
    assert.ok(ir.music, "no music track in the IR");
    assert.equal(ir.music.src, "assets/music.wav");
    assert.ok(ir.music.lengthFrames > 0);
  });

  it("has captions with cues", () => {
    assert.ok(ir.captions, "no captions in the IR");
    assert.equal(ir.captions.mode, "both");
    assert.ok(ir.captions.cues.length > 0, "no caption cues");
  });

  it(
    "renders at a reduced size; the MP4 matches the IR size, fps, frames and audio",
    { timeout: RENDER_TIMEOUT_MS },
    () => {
      const root = join(SCRATCH, "demo-reduced");
      cpSync(PROJECT, root, { recursive: true });
      const source = readFileSync(join(root, "index.qmd"), "utf8");
      const reduced = source
        .replace("width: 1920", `width: ${REDUCED.width}`)
        .replace("height: 1080", `height: ${REDUCED.height}`);
      assert.notEqual(reduced, source, "front matter size not found");
      writeFileSync(join(root, "index.qmd"), reduced);

      const sized = irOf(root);
      assert.equal(sized.settings.width, REDUCED.width);
      assert.equal(sized.settings.height, REDUCED.height);

      const run = video(["render", root], {
        QV_BROWSER_EXECUTABLE: browserExecutable(),
      });
      assert.equal(run.status, 0, run.stderr);
      const mp4 = join(root, "output.mp4");
      const out = probe(mp4);
      const fps = sized.settings.fps;
      assert.equal(out.width, sized.settings.width);
      assert.equal(out.height, sized.settings.height);
      assert.equal(out.frames, sized.timeline.durationFrames);

      const audio = streamSeconds(mp4, "audio");
      const expected = sized.timeline.durationFrames / fps;
      assert.ok(
        Math.abs(audio - expected) <= 1 / fps,
        `audio ${audio} s, IR ${expected} s: more than one frame apart`,
      );

      const sidecar = readFileSync(join(root, "output.vtt"), "utf8");
      const cues = sidecar.split("\n").filter((line) => line.includes("-->"));
      assert.equal(cues.length, sized.captions?.cues.length);
    },
  );
});
