// The theme render option through the real `video` bin (task 019a; PRD §5.2,
// §10): `--theme` wins over front matter, the default is `modern`, an unknown
// name is E_THEME_UNKNOWN (exit 1, no render), and an explicit video.background
// reaches the renderer. QV_TEST_RENDERER swaps in a recording stub, so no browser
// is needed beyond the probe preflight runs on the browser path (a headless
// shell, QV_BROWSER_EXECUTABLE or the Playwright cache, as in cli-render.test.ts).
// The canvas colour itself is checked in render-theme.test.ts.
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { delimiter, join } from "node:path";
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
  "recording-renderer.mjs",
);
const SCRATCH = mkdtempSync(join(tmpdir(), "video-theme-option-"));
const EXIT_USAGE = 2;

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

interface Call {
  theme: string | null;
  background: string | null;
}

let counter = 0;

after(() => rmSync(SCRATCH, { recursive: true, force: true }));

/** Copies a fixture's index.qmd into a fresh scratch dir; returns the project path. */
function copyProject(fixture: string): string {
  counter += 1;
  const root = join(SCRATCH, `${fixture}-${counter}`);
  mkdirSync(root, { recursive: true });
  copyFileSync(join(FIXTURES, fixture, "index.qmd"), join(root, "index.qmd"));
  return root;
}

/** Runs `video render <args> <project>` with the recording stub; returns its calls. */
function render(
  fixture: string,
  args: string[] = [],
): { status: number | null; output: string; project: string; calls: Call[] } {
  const project = copyProject(fixture);
  const log = join(project, "renderer.log");
  const result = spawnSync(
    join(BIN_DIR, "video"),
    ["render", ...args, project],
    {
      cwd: SCRATCH,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${BIN_DIR}${delimiter}${process.env["PATH"] ?? ""}`,
        QV_BROWSER_EXECUTABLE: browserExecutable(),
        QV_TEST_RENDERER: STUB,
        QV_TEST_RENDER_LOG: log,
        QV_TEST_RENDER_FRAMES: "30",
      },
    },
  );
  if (result.error !== undefined) throw result.error;
  const calls = existsSync(log)
    ? readFileSync(log, "utf8")
        .trimEnd()
        .split("\n")
        .map((line) => JSON.parse(line) as Call)
    : [];
  return {
    status: result.status,
    output: `${result.stdout}${result.stderr}`,
    project,
    calls,
  };
}

describe("video render --theme", () => {
  it("uses the modern theme and no background when no theme is named", () => {
    const run = render("theme-render-default");
    assert.equal(run.status, 0, run.output);
    assert.deepEqual(run.calls, [{ theme: "modern", background: null }]);
  });

  it("uses the render option over the front matter theme", () => {
    const run = render("theme-render-option", ["--theme", "modern"]);
    assert.equal(run.status, 0, run.output);
    assert.deepEqual(run.calls, [{ theme: "modern", background: null }]);
  });

  it("accepts --theme=<name> as well", () => {
    const run = render("theme-render-option", ["--theme=modern"]);
    assert.equal(run.status, 0, run.output);
    assert.equal(run.calls[0]?.theme, "modern");
  });

  it("resolves the front matter theme when no render option is given", () => {
    const run = render("theme-render-option");
    assert.equal(run.status, 1, run.output);
    assert.match(run.output, /Unknown theme "retro"/);
    assert.deepEqual(run.calls, []);
  });

  it("rejects an unknown theme option with E_THEME_UNKNOWN, exit 1, no render", () => {
    const run = render("theme-render-option", ["--theme", "retro"]);
    assert.equal(run.status, 1, run.output);
    assert.match(run.output, /Unknown theme "retro"/);
    assert.match(run.output, /Available themes: modern\./);
    assert.deepEqual(run.calls, []);
    assert.equal(existsSync(join(run.project, "output.mp4")), false);
  });

  it("passes the explicit video.background to the renderer", () => {
    const run = render("theme-render-background");
    assert.equal(run.status, 0, run.output);
    assert.deepEqual(run.calls, [{ theme: "modern", background: "#2E7D32" }]);
  });

  it("exits 2 when --theme has no name", () => {
    const bare = spawnSync(join(BIN_DIR, "video"), ["render", "--theme"], {
      cwd: SCRATCH,
      encoding: "utf8",
    });
    assert.equal(bare.status, EXIT_USAGE);
  });
});
