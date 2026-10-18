// Path robustness (task 048; PRD §4.1, §11.3, §13.2; ADR-0006). The acceptance demo
// (videos/demo, task 047) is copied to `My Videos/démo 動画` (spaces, Latin and CJK) and
// run through the `video` bin from four cwds with relative and absolute folder or .qmd
// paths: each validates with no diagnostics and renders to <project>/output.mp4. A rendered
// project moved to another non-ASCII path re-renders to the same frames: every decoded
// frame's framemd5 is compared, which includes the sampled stills. Windows-style
// separators are rejected per ADR-0006. Runs under tsx with node:test, in the
// test:integration:render group. Renders at 960x540, as demo.test.ts does.
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, delimiter, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { findBrowser } from "../visual/harness.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN = join(ROOT, "node_modules", ".bin", "video");
const DEMO = join(ROOT, "videos", "demo");
const SCRATCH = mkdtempSync(join(tmpdir(), "video-paths-"));
const PARENT_NAME = "My Videos";
const PROJECT_NAME = "démo 動画";
const MOVED_PARENT = "ドキュメント 2";
const REDUCED = { width: 960, height: 540 };
const RENDER_TIMEOUT_MS = 600_000;
const browser = findBrowser();

after(() => rmSync(SCRATCH, { recursive: true, force: true }));

/** Copies the demo to `<parent>/démo 動画` at the reduced size; returns the project path. */
function copyDemo(parent: string): string {
  const project = join(parent, PROJECT_NAME);
  mkdirSync(parent, { recursive: true });
  cpSync(DEMO, project, { recursive: true });
  const document = join(project, "index.qmd");
  const source = readFileSync(document, "utf8");
  const reduced = source
    .replace("width: 1920", `width: ${REDUCED.width}`)
    .replace("height: 1080", `height: ${REDUCED.height}`);
  assert.notEqual(reduced, source, "front matter size not found");
  writeFileSync(document, reduced);
  return project;
}

/** Runs the installed `video` bin from `cwd`. */
function video(args: string[], cwd: string): SpawnSyncReturns<string> {
  return spawnSync(BIN, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    env: {
      ...process.env,
      QV_BROWSER_EXECUTABLE: browser,
      PATH: `${dirname(BIN)}${delimiter}${process.env["PATH"] ?? ""}`,
    },
  });
}

/** The IR the validator prints for a project; the run must pass. */
function irOf(project: string): { timeline: { durationFrames: number } } {
  const run = video(["validate", "--print-ir", project], ROOT);
  assert.equal(run.status, 0, run.stderr);
  return JSON.parse(run.stdout) as { timeline: { durationFrames: number } };
}

/** Width, height and decoded frame count of the first video stream (ffprobe). */
function probe(file: string): {
  width: number;
  height: number;
  frames: number;
} {
  const run = spawnSync(
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
  if (run.status !== 0) throw new Error(`ffprobe failed: ${run.stderr}`);
  const stream = (
    JSON.parse(run.stdout) as {
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

/** One md5 per decoded frame of the video (ffmpeg framemd5, pixel data only). */
function frameHashes(file: string): string[] {
  const run = spawnSync(
    "ffmpeg",
    ["-v", "error", "-i", file, "-map", "0:v:0", "-f", "framemd5", "-"],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  assert.equal(run.status, 0, run.stderr);
  return run.stdout
    .split("\n")
    .filter((line) => line !== "" && !line.startsWith("#"))
    .map((line) => line.slice(line.lastIndexOf(",") + 1).trim());
}

/** Validates `input` from `cwd` (no diagnostics), renders it and checks where the output lands. */
function validateAndRender(project: string, input: string, cwd: string): void {
  const check = video(["validate", "--json", input], cwd);
  assert.equal(check.status, 0, check.stderr);
  assert.deepEqual(JSON.parse(check.stdout), []);

  const run = video(["render", input], cwd);
  assert.equal(run.status, 0, `render ${input} from ${cwd}: ${run.stderr}`);
  const output = join(project, "output.mp4");
  assert.ok(existsSync(output), `no output at ${output}`);
  assert.ok(
    !existsSync(join(cwd, "output.mp4")),
    `output written under the cwd ${cwd}`,
  );
  const info = probe(output);
  const ir = irOf(project);
  assert.equal(info.width, REDUCED.width);
  assert.equal(info.height, REDUCED.height);
  assert.equal(info.frames, ir.timeline.durationFrames);
}

interface Variant {
  name: string;
  /** The working directory the CLI runs in. */
  cwd: (project: string) => string;
  /** The path argument, given the project and the cwd. */
  input: (project: string, cwd: string) => string;
}

const VARIANTS: Variant[] = [
  {
    name: "a relative folder from the repository root",
    cwd: () => ROOT,
    input: (project, cwd) => relative(cwd, project),
  },
  {
    name: "an absolute folder from /",
    cwd: () => "/",
    input: (project) => project,
  },
  {
    name: "a relative .qmd file from the project's parent",
    cwd: (project) => dirname(project),
    input: (project) => join(basename(project), "index.qmd"),
  },
  {
    name: "an absolute .qmd file from an unrelated directory",
    cwd: () => SCRATCH,
    input: (project) => join(project, "index.qmd"),
  },
];

describe("project paths with spaces and non-ASCII characters", () => {
  VARIANTS.forEach((variant, index) => {
    it(
      `validates and renders ${variant.name}; output lands in the project`,
      { timeout: RENDER_TIMEOUT_MS },
      () => {
        const project = copyDemo(
          join(SCRATCH, `variant-${index}`, PARENT_NAME),
        );
        const cwd = variant.cwd(project);
        validateAndRender(project, variant.input(project, cwd), cwd);
      },
    );
  });
});

describe("a rendered project that is moved", () => {
  it(
    "re-renders to the same frame count and identical frames",
    { timeout: RENDER_TIMEOUT_MS * 2 },
    () => {
      const before = copyDemo(join(SCRATCH, "moved", PARENT_NAME));
      validateAndRender(before, before, ROOT);
      const first = frameHashes(join(before, "output.mp4"));

      // Move the whole project (with its output) to another path, then render again.
      const after = join(SCRATCH, "moved", MOVED_PARENT, PROJECT_NAME);
      mkdirSync(dirname(after), { recursive: true });
      renameSync(before, after);
      rmSync(join(after, "output.mp4"));
      validateAndRender(after, after, ROOT);
      const second = frameHashes(join(after, "output.mp4"));

      assert.equal(
        second.length,
        first.length,
        "frame count changed after the move",
      );
      const mismatch = first.findIndex((hash, frame) => second[frame] !== hash);
      assert.equal(mismatch, -1, `frame ${mismatch} differs after the move`);
    },
  );
});

describe("Windows-style separators (ADR-0006)", () => {
  it("rejects a backslash asset path in front matter as E_ASSET_INVALID", () => {
    const project = copyDemo(join(SCRATCH, "backslash-asset", PARENT_NAME));
    const document = join(project, "index.qmd");
    const source = readFileSync(document, "utf8");
    const edited = source.replace(
      "src: assets/captions.vtt",
      "src: assets\\captions.vtt",
    );
    assert.notEqual(edited, source, "captions src not found");
    writeFileSync(document, edited);

    const run = video(["validate", "--json", project], ROOT);
    assert.equal(run.status, 1, run.stdout);
    const codes = (JSON.parse(run.stdout) as { code: string }[]).map(
      (d) => d.code,
    );
    assert.ok(codes.includes("E_ASSET_INVALID"), `codes: ${codes.join(", ")}`);
    assert.ok(
      !run.stdout.includes(SCRATCH),
      "a diagnostic printed an absolute path",
    );
  });

  it("rejects a backslash project path and writes no output", () => {
    const cwd = join(SCRATCH, "backslash-path");
    const project = copyDemo(join(cwd, PARENT_NAME));
    const run = video(["render", `${PARENT_NAME}\\${PROJECT_NAME}`], cwd);
    assert.notEqual(run.status, 0, "a backslash path was accepted");
    assert.match(run.stderr, /no such file or directory/);
    assert.ok(!existsSync(join(project, "output.mp4")), "output was written");
  });
});
