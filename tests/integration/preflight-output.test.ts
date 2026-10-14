// `video render` preflight (stage 5) and output check (stage 6) through the
// real bin (packages/cli/bin/video.mjs): a missing tool or browser exits 2
// before the renderer starts; a file with the wrong frame count exits 1, and
// no output.mp4 is written (tasks 018; PRD §9.1, §11.2). Fixtures are copied
// into a scratch dir. Needs ffmpeg, ffprobe and a Chromium headless shell.
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
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
const FIXTURES = join(ROOT, "tests", "fixtures", "projects");
const FIXTURE = "preflight-output-check";
const STUB_FAILING = join(
  ROOT,
  "tests",
  "integration",
  "support",
  "failing-renderer.mjs",
);
const STUB_SHORT = join(
  ROOT,
  "tests",
  "integration",
  "support",
  "short-renderer.mjs",
);
const SCRATCH = mkdtempSync(join(tmpdir(), "video-preflight-"));
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

/** Runs the installed `video` bin; an empty `env` value removes that variable. */
function video(
  args: string[],
  cwd: string,
  env: Record<string, string> = {},
): Run {
  const merged: Record<string, string> = {
    ...(process.env as Record<string, string>),
    QV_BROWSER_EXECUTABLE: browserExecutable(),
    PATH: `${BIN_DIR}${delimiter}${process.env["PATH"] ?? ""}`,
    ...env,
  };
  const result = spawnSync(join(BIN_DIR, "video"), args, {
    cwd,
    encoding: "utf8",
    timeout: TIMEOUT_MS,
    env: merged,
  });
  if (result.error !== undefined) throw result.error;
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

/** Copies the fixture's index.qmd into `<SCRATCH>/<group>/<FIXTURE>/`. */
function copyProject(group: string): string {
  const root = join(SCRATCH, group, FIXTURE);
  mkdirSync(root, { recursive: true });
  writeFileSync(
    join(root, "index.qmd"),
    readFileSync(join(FIXTURES, FIXTURE, "index.qmd"), "utf8"),
  );
  return root;
}

const expected = JSON.parse(
  readFileSync(join(FIXTURES, FIXTURE, "expected.json"), "utf8"),
) as { property: string; file: string; ir: number; output: number };

after(() => rmSync(SCRATCH, { recursive: true, force: true }));

describe("video render preflight (stage 5)", () => {
  it("exits 2 naming ffprobe, and does not start the renderer, when ffprobe is missing", () => {
    const project = copyProject("no-ffprobe");
    const log = join(SCRATCH, "no-ffprobe.log");
    const run = video(["render", FIXTURE], join(SCRATCH, "no-ffprobe"), {
      QV_TEST_MISSING: "ffprobe",
      QV_TEST_RENDERER: STUB_FAILING,
      QV_TEST_RENDER_LOG: log,
    });
    assert.equal(run.status, 2, run.stderr);
    assert.equal(run.stdout, "");
    assert.match(run.stderr, /video: ffprobe is not available/);
    assert.match(run.stderr, /install ffmpeg, which provides ffprobe/);
    assert.equal(existsSync(log), false, "the renderer must not start");
    assert.equal(existsSync(join(project, "output.mp4")), false);
  });

  it("exits 2 naming the browser and QV_BROWSER_EXECUTABLE when the browser is missing", () => {
    copyProject("no-browser");
    const log = join(SCRATCH, "no-browser.log");
    const run = video(["render", FIXTURE], join(SCRATCH, "no-browser"), {
      QV_TEST_MISSING: "browser",
      QV_TEST_RENDERER: STUB_FAILING,
      QV_TEST_RENDER_LOG: log,
    });
    assert.equal(run.status, 2, run.stderr);
    assert.match(run.stderr, /video: browser is not available/);
    assert.match(run.stderr, /set QV_BROWSER_EXECUTABLE/);
    assert.equal(existsSync(log), false, "the renderer must not start");
  });

  it("exits 2 when QV_BROWSER_EXECUTABLE is unset, instead of letting Remotion download a browser", () => {
    copyProject("unset-browser");
    const log = join(SCRATCH, "unset-browser.log");
    const run = video(["render", FIXTURE], join(SCRATCH, "unset-browser"), {
      QV_BROWSER_EXECUTABLE: "",
      QV_TEST_RENDERER: STUB_FAILING,
      QV_TEST_RENDER_LOG: log,
    });
    assert.equal(run.status, 2, run.stderr);
    assert.match(run.stderr, /video: browser is not available: .*not set/);
    assert.equal(existsSync(log), false, "the renderer must not start");
  });
});

describe("video render output check (stage 6)", () => {
  it(
    "exits 1 with E_OUTPUT_MISMATCH when the frame count differs from the IR",
    { timeout: TIMEOUT_MS },
    () => {
      const project = copyProject("frames");
      const run = video(["render", FIXTURE], join(SCRATCH, "frames"), {
        QV_TEST_RENDERER: STUB_SHORT,
        QV_TEST_RENDER_FRAMES: String(expected.output),
      });
      assert.equal(run.status, 1, run.stderr);
      assert.equal(run.stdout.includes("Wrote"), false, run.stdout);
      assert.match(run.stderr, /^ERROR output\.mp4$/m);
      assert.match(
        run.stderr,
        new RegExp(
          `${expected.property}: ${expected.file} has ${expected.output}, the IR expects ${expected.ir}\\.`,
        ),
      );
      assert.equal(existsSync(join(project, "output.mp4")), false);
      assert.deepEqual(readdirSync(join(project, ".video-build")).sort(), [
        "diagnostics.json",
        "manifest.json",
        "render.json",
      ]);
    },
  );

  it(
    "keeps the previous output.mp4 when the output check fails",
    { timeout: TIMEOUT_MS },
    () => {
      const project = copyProject("frames-previous");
      writeFileSync(join(project, "output.mp4"), "previous video bytes");
      const run = video(["render", FIXTURE], join(SCRATCH, "frames-previous"), {
        QV_TEST_RENDERER: STUB_SHORT,
        QV_TEST_RENDER_FRAMES: String(expected.output),
      });
      assert.equal(run.status, 1, run.stderr);
      assert.equal(
        readFileSync(join(project, "output.mp4"), "utf8"),
        "previous video bytes",
      );
    },
  );
});
