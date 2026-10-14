// `video render` through the real bin (packages/cli/bin/video.mjs): output
// size/fps/frames (ffprobe), exit codes, stream routing, temp-file handling
// and cwd independence (tasks 006; PRD §4.2, §11.2). Runs under tsx with
// node:test, like validate.test.ts. Fixtures are copied into a scratch dir,
// so no build output lands in tests/fixtures. Needs a Chromium headless shell
// (QV_BROWSER_EXECUTABLE, or the Playwright cache): no shell is a failure.
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { delimiter, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";
import { strict as assert } from "node:assert";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN_DIR = join(ROOT, "node_modules", ".bin");
const FIXTURES = join(ROOT, "tests", "fixtures", "projects");
const STUB = join(
  ROOT,
  "tests",
  "integration",
  "support",
  "failing-renderer.mjs",
);
const SCRATCH = mkdtempSync(join(tmpdir(), "video-render-"));
const TIMEOUT_MS = 300_000;

interface Run {
  status: number | null;
  stdout: string;
  stderr: string;
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
  if (!dir)
    throw new Error(
      `no headless shell under ${root}; set QV_BROWSER_EXECUTABLE`,
    );
  return join(root, dir, "chrome-linux", "headless_shell");
}

/** Runs the installed `video` bin from `cwd` with extra environment. */
function video(
  args: string[],
  cwd: string,
  env: Record<string, string> = {},
): Run {
  const result = spawnSync(join(BIN_DIR, "video"), args, {
    cwd,
    encoding: "utf8",
    timeout: TIMEOUT_MS,
    env: {
      ...process.env,
      QV_BROWSER_EXECUTABLE: browserExecutable(),
      PATH: `${BIN_DIR}${delimiter}${process.env["PATH"] ?? ""}`,
      ...env,
    },
  });
  if (result.error !== undefined) throw result.error;
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

/**
 * Copies `<fixture>/index.qmd` into `<SCRATCH>/<group>/<fixture>/` and returns
 * that project directory. `patch` rewrites the document text (for example to
 * add a `video.output` key).
 */
function copyProject(
  fixture: string,
  group: string,
  patch?: [string, string],
): string {
  const root = join(SCRATCH, group, fixture);
  mkdirSync(root, { recursive: true });
  const text = readFileSync(join(FIXTURES, fixture, "index.qmd"), "utf8");
  const next = patch ? text.replace(patch[0], patch[1]) : text;
  writeFileSync(join(root, "index.qmd"), next);
  return root;
}

interface Probe {
  width: number;
  height: number;
  rFrameRate: string;
  frames: number;
}

/** Reads the first video stream's size, rate and decoded frame count. */
function probe(file: string): Probe {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-count_frames",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,r_frame_rate,nb_read_frames",
      "-of",
      "json",
      file,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`ffprobe failed: ${result.stderr}`);
  const stream = (
    JSON.parse(result.stdout) as { streams: Record<string, string | number>[] }
  ).streams[0];
  if (!stream) throw new Error(`no video stream in ${file}`);
  return {
    width: Number(stream["width"]),
    height: Number(stream["height"]),
    rFrameRate: String(stream["r_frame_rate"]),
    frames: Number(stream["nb_read_frames"]),
  };
}

/** Sum of durationFrames in the manifest the filter wrote for `project`. */
function irFrames(project: string): number {
  const ir = JSON.parse(
    readFileSync(join(project, ".video-build", "manifest.json"), "utf8"),
  ) as {
    scenes: { durationFrames: number }[];
  };
  return ir.scenes.reduce((sum, scene) => sum + scene.durationFrames, 0);
}

after(() => rmSync(SCRATCH, { recursive: true, force: true }));

describe("video render", () => {
  it(
    "renders a 640x360, 1 s project with the size, fps and frames of the IR",
    { timeout: TIMEOUT_MS },
    () => {
      const project = copyProject("cli-render-small", "basic");
      const run = video(["render", "cli-render-small"], join(SCRATCH, "basic"));
      assert.equal(run.status, 0, run.stderr);
      const lines = run.stdout.trimEnd().split("\n");
      assert.equal(lines.at(-1), "Wrote cli-render-small/output.mp4");
      const percents = lines
        .slice(0, -1)
        .map((line) => Number(/^(\d+)%$/.exec(line)?.[1]));
      assert.ok(percents.length > 0, "expected percent progress lines");
      assert.ok(
        percents.every((value) => value >= 0 && value <= 100),
        run.stdout,
      );
      assert.deepEqual(
        [...percents].sort((a, b) => a - b),
        percents,
      );

      const result = probe(join(project, "output.mp4"));
      assert.equal(result.width, 640);
      assert.equal(result.height, 360);
      assert.equal(result.rFrameRate, "30/1");
      assert.equal(result.frames, 30);
      assert.equal(result.frames, irFrames(project));
    },
  );

  it(
    "writes video.output relative to the project root",
    { timeout: TIMEOUT_MS },
    () => {
      const project = copyProject("cli-render-small", "custom-output", [
        "  fps: 30\n",
        "  fps: 30\n  output: exports/small.mp4\n",
      ]);
      const run = video(
        ["render", "cli-render-small"],
        join(SCRATCH, "custom-output"),
      );
      assert.equal(run.status, 0, run.stderr);
      assert.equal(
        run.stdout.trimEnd().split("\n").at(-1),
        "Wrote cli-render-small/exports/small.mp4",
      );
      assert.ok(existsSync(join(project, "exports", "small.mp4")));
      assert.ok(!existsSync(join(project, "output.mp4")));
    },
  );

  it(
    "accepts an index.qmd path and resolves paths from any cwd",
    { timeout: TIMEOUT_MS },
    () => {
      const project = copyProject("cli-render-small", "qmd-file");
      const document = join(project, "index.qmd");
      const run = video(["render", document], ROOT);
      assert.equal(run.status, 0, run.stderr);
      const output = join(project, "output.mp4");
      assert.equal(
        run.stdout.trimEnd().split("\n").at(-1),
        `Wrote ${relative(ROOT, output)}`,
      );
      assert.equal(probe(output).frames, 30);
    },
  );

  it("exits 1 without starting the renderer when validation fails", () => {
    const project = copyProject("cli-render-invalid", "invalid");
    const log = join(SCRATCH, "invalid-renderer.log");
    const run = video(["render", project], SCRATCH, {
      QV_TEST_RENDERER: STUB,
      QV_TEST_RENDER_LOG: log,
    });
    assert.equal(run.status, 1);
    assert.equal(run.stdout, "");
    assert.match(run.stderr, /index\.qmd: duration "0s" must be at least 1s/);
    assert.equal(existsSync(log), false, "the renderer must not be invoked");
    assert.equal(existsSync(join(project, "output.mp4")), false);
  });

  it("keeps the previous output.mp4 and leaves no partial file when rendering fails", () => {
    const project = copyProject("cli-render-small", "forced-failure");
    const previous = join(project, "output.mp4");
    writeFileSync(previous, "previous video bytes");
    const past = new Date("2001-09-09T01:46:40Z");
    utimesSync(previous, past, past);
    const beforeStat = statSync(previous);
    const log = join(SCRATCH, "forced-renderer.log");

    const run = video(
      ["render", "cli-render-small"],
      join(SCRATCH, "forced-failure"),
      {
        QV_TEST_RENDERER: STUB,
        QV_TEST_RENDER_LOG: log,
      },
    );

    assert.equal(run.status, 1);
    assert.equal(run.stdout, "");
    assert.match(
      run.stderr,
      /video: render failed: stub renderer: forced failure/,
    );
    assert.ok(existsSync(log), "the renderer was invoked");
    assert.equal(readFileSync(previous, "utf8"), "previous video bytes");
    assert.equal(statSync(previous).mtimeMs, beforeStat.mtimeMs);
    assert.deepEqual(readdirSync(join(project, ".video-build")).sort(), [
      "manifest.json",
      "render.json",
    ]);
  });

  it("leaves no output.mp4 when rendering fails and none existed", () => {
    const project = copyProject("cli-render-small", "forced-fresh");
    const run = video(
      ["render", "cli-render-small"],
      join(SCRATCH, "forced-fresh"),
      {
        QV_TEST_RENDERER: STUB,
        QV_TEST_RENDER_LOG: join(SCRATCH, "fresh-renderer.log"),
      },
    );
    assert.equal(run.status, 1);
    assert.equal(existsSync(join(project, "output.mp4")), false);
  });

  it("exits 2 with usage for a missing path argument", () => {
    const run = video(["render"], SCRATCH);
    assert.equal(run.status, 2);
    assert.equal(run.stdout, "");
    assert.match(run.stderr, /^usage: video validate/m);
  });

  it("exits 2 and names the path when it does not exist", () => {
    const run = video(["render", "does/not/exist"], SCRATCH);
    assert.equal(run.status, 2);
    assert.match(run.stderr, /does\/not\/exist: no such file or directory/);
  });
});
