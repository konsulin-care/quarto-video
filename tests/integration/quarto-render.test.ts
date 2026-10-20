// `quarto render` writes output.mp4 through the extension's post-render filter
// (task 053; ADR-0022): `filters: [video]` and nothing else, no hook script.
// In this repository: videos/hello rendered in the file and directory forms
// through the root _quarto.yml. As a user would: a scratch project that
// installs the extension with `quarto add <repo>`, renders, then fails on an
// invalid scene and on a missing `video` CLI with a non-zero exit and no
// output. `video` is found on PATH (node_modules/.bin). Needs quarto
// (ADR-0010 pin), ffprobe and a Chromium headless shell: a missing tool is a
// failure.
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
const PROJECT = join(ROOT, "videos", "hello");
const SCRATCH = mkdtempSync(join(tmpdir(), "quarto-render-"));
const TIMEOUT_MS = 300_000;
// Build outputs quarto and the CLI leave in the committed project directory.
const GENERATED = ["output.mp4", "index.html", "index_files", ".video-build"];
// The user's project: the README's _quarto.yml, which loads the extension.
const USER_QUARTO_YML =
  "project:\n  type: default\n  render:\n    - index.qmd\nfilters:\n  - video\n";

interface Run {
  status: number | null;
  output: string;
}

/** Chromium headless shell: QV_BROWSER_EXECUTABLE, else the Playwright cache. */
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

/** PATH with the repo's node_modules/.bin first, so `video` is on PATH. */
function pathWithLocalBin(): string {
  return `${BIN_DIR}${delimiter}${process.env["PATH"] ?? ""}`;
}

/** PATH without the repo's node_modules/.bin, so `video` is not on PATH. */
function pathWithoutLocalBin(): string {
  return (process.env["PATH"] ?? "")
    .split(delimiter)
    .filter((dir) => dir !== BIN_DIR)
    .join(delimiter);
}

/** Runs `quarto <args>` from `cwd`; stdout and stderr are merged. */
function quarto(args: string[], cwd: string, path: string): Run {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: path,
    QV_BROWSER_EXECUTABLE: browserExecutable(),
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1",
  };
  delete env["QUARTO_VIDEO_CLI"];
  const result = spawnSync("quarto", args, {
    cwd,
    encoding: "utf8",
    timeout: TIMEOUT_MS,
    env,
  });
  if (result.error !== undefined) throw result.error;
  return {
    status: result.status,
    output: `${result.stdout}${result.stderr}`,
  };
}

/** Removes the outputs of earlier runs so each test sees only its own. */
function clean(dir: string): void {
  for (const name of GENERATED) {
    rmSync(join(dir, name), { recursive: true, force: true });
  }
  rmSync(join(ROOT, ".quarto"), { recursive: true, force: true });
}

/** Asserts the MP4 is 1920x1080, 30/1 fps, 120 frames (videos/hello). */
function assertMp4(file: string): void {
  assert.ok(existsSync(file), `missing ${file}`);
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
      "default=nw=1:nk=1",
      file,
    ],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stdout.trim().split("\n").join(","),
    "1920,1080,30/1,120",
  );
}

/** A user project: `quarto add <repo>`, the README _quarto.yml, hello's qmd. */
function userProject(): string {
  const project = join(SCRATCH, "work", "my-video");
  mkdirSync(project, { recursive: true });
  const add = quarto(["add", ROOT, "--no-prompt"], project, pathWithLocalBin());
  assert.equal(add.status, 0, add.output);
  assert.ok(existsSync(join(project, "_extensions", "video", "render.lua")));
  writeFileSync(join(project, "_quarto.yml"), USER_QUARTO_YML);
  copyFileSync(join(PROJECT, "index.qmd"), join(project, "index.qmd"));
  return project;
}

after(() => {
  clean(PROJECT);
  rmSync(SCRATCH, { recursive: true, force: true });
});

describe("quarto render in this repository (root _quarto.yml)", () => {
  it(
    "writes output.mp4 for quarto render videos/hello/index.qmd",
    { timeout: TIMEOUT_MS },
    () => {
      clean(PROJECT);
      const run = quarto(
        ["render", "videos/hello/index.qmd"],
        ROOT,
        pathWithLocalBin(),
      );
      assert.equal(run.status, 0, run.output);
      assert.match(run.output, /Wrote output\.mp4/);
      assertMp4(join(PROJECT, "output.mp4"));
    },
  );

  it(
    "writes output.mp4 for quarto render videos/hello",
    { timeout: TIMEOUT_MS },
    () => {
      clean(PROJECT);
      const run = quarto(["render", "videos/hello"], ROOT, pathWithLocalBin());
      assert.equal(run.status, 0, run.output);
      assert.match(run.output, /Wrote output\.mp4/);
      assertMp4(join(PROJECT, "output.mp4"));
    },
  );
});

describe("quarto render in a project with the extension installed", () => {
  it(
    "writes output.mp4 for quarto render <project-dir>, after quarto add",
    { timeout: TIMEOUT_MS },
    () => {
      const project = userProject();
      const run = quarto(
        ["render", "my-video"],
        join(project, ".."),
        pathWithLocalBin(),
      );
      assert.equal(run.status, 0, run.output);
      assert.match(run.output, /Wrote output\.mp4/);
      assertMp4(join(project, "output.mp4"));
    },
  );

  it(
    "exits non-zero and leaves no output.mp4 when video render fails",
    { timeout: TIMEOUT_MS },
    () => {
      const project = join(SCRATCH, "work", "my-video");
      rmSync(join(project, "output.mp4"), { force: true });
      // An invalid scene (duration 0s): `video render` fails validation.
      const document = join(project, "index.qmd");
      const text = readFileSync(document, "utf8");
      writeFileSync(document, text.replace('duration="2s"', 'duration="0s"'));

      const run = quarto(["render", "index.qmd"], project, pathWithLocalBin());
      writeFileSync(document, text);
      assert.notEqual(run.status, 0, run.output);
      assert.match(
        run.output,
        /Scene "scene-001" has duration "0s", which must be greater than zero/,
      );
      assert.match(run.output, /quarto-video: `video render` failed/);
      assert.equal(existsSync(join(project, "output.mp4")), false);
    },
  );

  it(
    "exits non-zero and names the missing renderer when video is not on PATH",
    { timeout: TIMEOUT_MS },
    () => {
      const project = join(SCRATCH, "work", "my-video");
      const run = quarto(["render"], project, pathWithoutLocalBin());
      assert.notEqual(run.status, 0, run.output);
      assert.match(
        run.output,
        /quarto-video: the `video` renderer is not installed or not on PATH/,
      );
      assert.equal(existsSync(join(project, "output.mp4")), false);
    },
  );
});
