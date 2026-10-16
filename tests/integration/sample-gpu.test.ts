// The gpu sample explainer (task 036; PRD §1.3, §15). videos/gpu is authored
// only in the DSL: it validates with zero diagnostics and is 45 to 60 s long.
// A copy at a reduced size renders, and its MP4 matches the IR's settings and
// frame count. No file under renderer/ mentions the project.
// Runs under tsx with node:test, in the test:integration:render group.
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";
import { strict as assert } from "node:assert";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN_DIR = join(ROOT, "node_modules", ".bin");
const PROJECT = join(ROOT, "videos", "gpu");
const RENDERER = join(ROOT, "renderer");
const SCRATCH = mkdtempSync(join(tmpdir(), "video-sample-gpu-"));
const REDUCED = { width: 960, height: 540 };
const RENDER_TIMEOUT_MS = 600_000;

after(() => rmSync(SCRATCH, { recursive: true, force: true }));

interface Run {
  status: number | null;
  stdout: string;
  stderr: string;
}

interface Ir {
  settings: { width: number; height: number; fps: number };
  timeline: { durationFrames: number };
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

/** Every file under `dir`, skipping node_modules. */
function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "node_modules" ? [] : filesUnder(path);
    }
    return entry.isFile() ? [path] : [];
  });
}

describe("videos/gpu sample explainer", () => {
  it("validates with zero diagnostics", () => {
    const run = video(["validate", "--json", PROJECT]);
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual(JSON.parse(run.stdout), []);
  });

  it("is 45 to 60 seconds long", () => {
    const ir = irOf(PROJECT);
    const seconds = ir.timeline.durationFrames / ir.settings.fps;
    assert.ok(seconds >= 45 && seconds <= 60, `duration is ${seconds} s`);
  });

  it(
    "renders at a reduced size; the MP4 matches the IR settings and frame count",
    { timeout: RENDER_TIMEOUT_MS },
    () => {
      const root = join(SCRATCH, "gpu-reduced");
      mkdirSync(join(root, "data"), { recursive: true });
      const source = readFileSync(join(PROJECT, "index.qmd"), "utf8");
      const reduced = source
        .replace("width: 1920", `width: ${REDUCED.width}`)
        .replace("height: 1080", `height: ${REDUCED.height}`);
      assert.notEqual(reduced, source, "front matter size not found");
      writeFileSync(join(root, "index.qmd"), reduced);
      copyFileSync(
        join(PROJECT, "data", "throughput.csv"),
        join(root, "data", "throughput.csv"),
      );

      const ir = irOf(root);
      assert.equal(ir.settings.width, REDUCED.width);
      assert.equal(ir.settings.height, REDUCED.height);

      const run = video(["render", root], {
        QV_BROWSER_EXECUTABLE: browserExecutable(),
      });
      assert.equal(run.status, 0, run.stderr);
      const out = probe(join(root, "output.mp4"));
      assert.equal(out.width, ir.settings.width);
      assert.equal(out.height, ir.settings.height);
      assert.equal(out.frames, ir.timeline.durationFrames);
    },
  );
});

describe("renderer stays generic (task 036)", () => {
  it("no file under renderer/ mentions gpu, in any case", () => {
    const hits = filesUnder(RENDERER).filter((file) =>
      /gpu/i.test(readFileSync(file, "utf8")),
    );
    assert.deepEqual(
      hits.map((file) => file.slice(ROOT.length)),
      [],
    );
  });
});
