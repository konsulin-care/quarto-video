// The `stagger` preset through the real `video` bin (task 028; PRD §5.6). The
// valid fixtures pass stage 2 with no diagnostics. A stagger scene on a
// component the preset does not list (statement) is E_ANIMATION_INCOMPATIBLE.
import { spawnSync } from "node:child_process";
import {
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
const FIXTURES = join(ROOT, "tests", "fixtures", "projects");
const SCRATCH = mkdtempSync(join(tmpdir(), "video-stagger-"));

after(() => rmSync(SCRATCH, { recursive: true, force: true }));

/** Runs the installed `video` bin from the repository root. */
function video(args: string[]) {
  const result = spawnSync(join(BIN_DIR, "video"), args, {
    cwd: ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${BIN_DIR}${delimiter}${process.env["PATH"] ?? ""}`,
    },
  });
  if (result.error !== undefined) throw result.error;
  return result;
}

/** Writes a scratch project with `text` as its index.qmd and returns its root. */
function scratchProject(name: string, text: string): string {
  const root = join(SCRATCH, name);
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, "index.qmd"), text);
  return root;
}

/** Copies a fixture's index.qmd to a scratch project and returns its root. */
function copyFixture(fixture: string): string {
  return scratchProject(
    fixture,
    readFileSync(join(FIXTURES, fixture, "index.qmd"), "utf8"),
  );
}

describe("preset stagger fixtures", () => {
  it("preset-stagger validates with no diagnostics", () => {
    const run = video(["validate", copyFixture("preset-stagger")]);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stdout, "OK preset-stagger (3 scenes, 210 frames)\n");
  });

  it("reduced-motion-stagger validates with no diagnostics", () => {
    const run = video(["validate", copyFixture("reduced-motion-stagger")]);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(
      run.stdout,
      "OK reduced-motion-stagger (3 scenes, 210 frames)\n",
    );
  });

  it("stagger on a statement is E_ANIMATION_INCOMPATIBLE, an error, exit 1", () => {
    const root = scratchProject(
      "stagger-incompatible",
      [
        "---",
        'title: "Stagger incompatible"',
        "---",
        "",
        '::: {.scene component="statement" duration="3s" animation="stagger"}',
        "A statement is not a list.",
        ":::",
        "",
      ].join("\n"),
    );
    const run = video(["validate", "--json", root]);
    assert.equal(run.status, 1, run.stderr);
    const diagnostics = JSON.parse(run.stdout) as Array<{
      code: string;
      severity: string;
      sceneId: string;
    }>;
    assert.deepEqual(
      diagnostics.map((d) => [d.code, d.severity]),
      [["E_ANIMATION_INCOMPATIBLE", "error"]],
    );
  });
});
