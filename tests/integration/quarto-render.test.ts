// `quarto render` writes output.mp4 for videos/hello through the shared
// videos/ project and its post-render hook (task 052; ADR-0021, which extends
// ADR-0002): file and directory forms, and a failing `video render` that fails
// quarto and leaves no output. videos/hello has no Quarto files of its own. The
// two success forms render in place with node_modules/.bin off PATH, so the
// hook finds the CLI through `npm exec --prefix <repo>`. The failure case runs
// on a scratch copy with the local bin on PATH. Needs quarto (ADR-0010 pin),
// ffprobe and a Chromium headless shell: a missing tool is a failure.
import { spawnSync } from "node:child_process";
import {
  chmodSync,
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
const VIDEOS = join(ROOT, "videos");
const PROJECT = join(VIDEOS, "hello");
const SCRATCH = mkdtempSync(join(tmpdir(), "quarto-render-"));
const TIMEOUT_MS = 300_000;
// Build outputs quarto and the CLI leave in the committed project directory.
const GENERATED = [
  "output.mp4",
  "index.html",
  "index_files",
  ".quarto",
  ".gitignore",
  ".video-build",
];
// Files quarto writes at the root of the shared videos/ project.
const SHARED_GENERATED = [".quarto", ".gitignore"];

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

/** PATH without the repo's node_modules/.bin, so `video` is not on PATH. */
function pathWithoutLocalBin(): string {
  return (process.env["PATH"] ?? "")
    .split(delimiter)
    .filter((dir) => dir !== BIN_DIR)
    .join(delimiter);
}

/** Runs `quarto render <target>` from `cwd`; stdout and stderr are merged. */
function quartoRender(target: string, cwd: string, path: string): Run {
  const result = spawnSync("quarto", ["render", target], {
    cwd,
    encoding: "utf8",
    timeout: TIMEOUT_MS,
    env: {
      ...process.env,
      PATH: path,
      QV_BROWSER_EXECUTABLE: browserExecutable(),
      PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1",
    },
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
  for (const name of SHARED_GENERATED) {
    rmSync(join(VIDEOS, name), { recursive: true, force: true });
  }
}

/** Asserts the MP4 is 1920x1080, 30/1 fps, 120 frames (ADR-0002). */
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

after(() => {
  clean(PROJECT);
  rmSync(SCRATCH, { recursive: true, force: true });
});

describe("quarto render with the shared videos/ post-render hook", () => {
  it(
    "writes output.mp4 for quarto render videos/hello/index.qmd",
    { timeout: TIMEOUT_MS },
    () => {
      clean(PROJECT);
      assert.equal(existsSync(join(PROJECT, "_quarto.yml")), false);
      const run = quartoRender(
        "videos/hello/index.qmd",
        ROOT,
        pathWithoutLocalBin(),
      );
      assert.equal(run.status, 0, run.output);
      assert.match(run.output, /Wrote hello\/output\.mp4/);
      assertMp4(join(PROJECT, "output.mp4"));
    },
  );

  it(
    "writes output.mp4 for quarto render videos/hello",
    { timeout: TIMEOUT_MS },
    () => {
      clean(PROJECT);
      const run = quartoRender("videos/hello", ROOT, pathWithoutLocalBin());
      assert.equal(run.status, 0, run.output);
      assert.match(run.output, /Wrote hello\/output\.mp4/);
      assertMp4(join(PROJECT, "output.mp4"));
    },
  );

  it(
    "exits non-zero and leaves no output.mp4 when video render fails",
    { timeout: TIMEOUT_MS },
    () => {
      // A scratch copy of the shared project with an invalid scene (duration
      // 0s), so the hook's `video render` fails validation and no earlier
      // output exists. quarto runs from inside the project directory.
      const videos = join(SCRATCH, "invalid", "videos");
      const copy = join(videos, "hello");
      mkdirSync(copy, { recursive: true });
      for (const name of ["_quarto.yml", "_render-video.sh"]) {
        copyFileSync(join(VIDEOS, name), join(videos, name));
      }
      chmodSync(join(videos, "_render-video.sh"), 0o755);
      copyFileSync(join(PROJECT, "index.qmd"), join(copy, "index.qmd"));
      const document = join(copy, "index.qmd");
      writeFileSync(
        document,
        readFileSync(document, "utf8").replace(
          'duration="2s"',
          'duration="0s"',
        ),
      );

      const run = quartoRender(
        "index.qmd",
        copy,
        `${BIN_DIR}${delimiter}${process.env["PATH"] ?? ""}`,
      );
      assert.notEqual(run.status, 0, run.output);
      assert.match(
        run.output,
        /Scene "scene-001" has duration "0s", which must be greater than zero/,
      );
      assert.equal(existsSync(join(copy, "output.mp4")), false);
    },
  );
});
