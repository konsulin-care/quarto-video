// The browser gate at the CLI boundary (packages/cli/src/cli.ts, stage 5): with
// QV_BROWSER_EXECUTABLE unset, `video render` exits 2 naming the variable, and
// the renderer is never called. The gate runs after stages 1–4, so this test
// needs no browser: the renderer it would call is a stub that logs its call.
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";
import { strict as assert } from "node:assert";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN_DIR = join(ROOT, "node_modules", ".bin");
const FIXTURE = "preflight-output-check";
const STUB_FAILING = join(
  ROOT,
  "tests",
  "integration",
  "support",
  "failing-renderer.mjs",
);
const SCRATCH = mkdtempSync(join(tmpdir(), "video-browser-gate-"));

after(() => rmSync(SCRATCH, { recursive: true, force: true }));

/** Copies the fixture's index.qmd into a scratch project and returns its root. */
function copyProject(group: string): string {
  const root = join(SCRATCH, group, FIXTURE);
  mkdirSync(root, { recursive: true });
  writeFileSync(
    join(root, "index.qmd"),
    readFileSync(
      join(ROOT, "tests", "fixtures", "projects", FIXTURE, "index.qmd"),
      "utf8",
    ),
  );
  return root;
}

/** Runs `video render` with QV_BROWSER_EXECUTABLE removed from the environment. */
function renderWithoutBrowser(cwd: string, log: string) {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${BIN_DIR}${delimiter}${process.env["PATH"] ?? ""}`,
    QV_TEST_RENDERER: STUB_FAILING,
    QV_TEST_RENDER_LOG: log,
  };
  delete env["QV_BROWSER_EXECUTABLE"];
  const result = spawnSync(join(BIN_DIR, "video"), ["render", FIXTURE], {
    cwd,
    encoding: "utf8",
    env,
  });
  if (result.error !== undefined) throw result.error;
  return result;
}

describe("video render browser gate (CLI boundary)", () => {
  it("exits 2 naming QV_BROWSER_EXECUTABLE when it is unset, and never calls the renderer", () => {
    const cwd = join(SCRATCH, "unset");
    const project = copyProject("unset");
    const log = join(SCRATCH, "unset-renderer.log");
    const run = renderWithoutBrowser(cwd, log);
    assert.equal(run.status, 2, run.stderr);
    assert.equal(run.stdout, "");
    assert.match(
      run.stderr,
      /video: browser is not available: QV_BROWSER_EXECUTABLE is not set/,
    );
    assert.match(run.stderr, /set QV_BROWSER_EXECUTABLE to its binary/);
    assert.equal(existsSync(log), false, "the renderer must not start");
    assert.equal(existsSync(join(project, "output.mp4")), false);
  });
});
