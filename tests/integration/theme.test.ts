// `theme:` in front matter through the real `video` bin (task 019; PRD §5.2):
// an unknown theme is E_THEME_UNKNOWN with exit 1 and no render; a registered
// one validates. Fixtures are copied to a scratch dir, so nothing is written
// into tests/fixtures.
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";
import { strict as assert } from "node:assert";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN_DIR = join(ROOT, "node_modules", ".bin");
const FIXTURES = join(ROOT, "tests", "fixtures", "projects");
const SCRATCH = mkdtempSync(join(tmpdir(), "video-theme-"));

interface Diagnostic {
  code: string;
  severity: string;
  file?: string;
  suggestion?: string;
}

/** Runs the installed `video` bin from the scratch dir. */
function video(args: string[]): {
  status: number | null;
  stdout: string;
  stderr: string;
} {
  const result = spawnSync(join(BIN_DIR, "video"), args, {
    cwd: SCRATCH,
    encoding: "utf8",
    env: {
      ...process.env,
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

/** Copies a fixture's index.qmd into the scratch dir and returns the project path. */
function copyProject(fixture: string): string {
  const root = join(SCRATCH, fixture);
  mkdirSync(root, { recursive: true });
  copyFileSync(join(FIXTURES, fixture, "index.qmd"), join(root, "index.qmd"));
  return root;
}

after(() => rmSync(SCRATCH, { recursive: true, force: true }));

describe("theme in front matter", () => {
  it("rejects an unknown theme with E_THEME_UNKNOWN listing the available themes", () => {
    const project = copyProject("theme-unknown");
    const run = video(["validate", "--json", project]);
    assert.equal(run.status, 1, run.stderr);
    const diagnostics = JSON.parse(run.stdout) as Diagnostic[];
    assert.deepEqual(
      diagnostics.map((d) => [d.code, d.severity, d.file]),
      [["E_THEME_UNKNOWN", "error", "index.qmd"]],
    );
    assert.equal(diagnostics[0]?.suggestion, "Available themes: modern.");
  });

  it("writes no video for an unknown theme", () => {
    const project = copyProject("theme-unknown");
    const run = video(["render", project]);
    assert.equal(run.status, 1, run.stderr);
    assert.match(run.stderr, /E_THEME_UNKNOWN|Unknown theme/);
    assert.equal(existsSync(join(project, "output.mp4")), false);
  });

  it("validates a document that names a registered theme", () => {
    const project = copyProject("theme-modern");
    const run = video(["validate", project]);
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /^OK theme-modern /);
  });
});
