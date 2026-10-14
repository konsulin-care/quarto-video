// Scene ids and source lines through the real `video` bin (task 011): the IR
// and the diagnostics carry the line of each scene's opening fence
// (_extensions/video/README.md, "Scene ids and source lines"). Fixtures are
// copied to a scratch dir, so the filter's .video-build never lands in
// tests/fixtures.
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { parseDiagnostics, type Diagnostic } from "@quarto-video/validator";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN_DIR = join(ROOT, "node_modules", ".bin");
const FIXTURES = join(ROOT, "tests", "fixtures", "projects");
const SCRATCH = mkdtempSync(join(tmpdir(), "video-scene-lines-"));

interface Run {
  status: number | null;
  stdout: string;
  stderr: string;
}

/** Runs the installed `video` bin from the repository root. */
function video(args: string[]): Run {
  const result = spawnSync(join(BIN_DIR, "video"), args, {
    cwd: ROOT,
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

/** Copies a fixture's index.qmd to a scratch project and returns its root. */
function copyProject(fixture: string): string {
  const root = join(SCRATCH, fixture);
  mkdirSync(root, { recursive: true });
  copyFileSync(join(FIXTURES, fixture, "index.qmd"), join(root, "index.qmd"));
  return root;
}

function diagnosticsOf(stdout: string): Diagnostic[] {
  const list = parseDiagnostics(stdout);
  assert.ok(list, `stdout is not a valid diagnostics array:\n${stdout}`);
  return list;
}

after(() => rmSync(SCRATCH, { recursive: true, force: true }));

describe("scene ids and source lines", () => {
  it("writes the IR that expected.json describes, with a line per scene", () => {
    const run = video([
      "validate",
      "--print-ir",
      copyProject("scene-lines-ok"),
    ]);
    assert.equal(run.status, 0, run.stderr);
    const expected: unknown = JSON.parse(
      readFileSync(join(FIXTURES, "scene-lines-ok", "expected.json"), "utf8"),
    );
    assert.deepEqual(JSON.parse(run.stdout), expected);
  });

  it("keeps author ids and generates the others in document order", () => {
    const run = video([
      "validate",
      "--print-ir",
      copyProject("scene-lines-ok"),
    ]);
    const ir = JSON.parse(run.stdout) as {
      scenes: { id: string; source: { line?: number } }[];
    };
    assert.deepEqual(
      ir.scenes.map((s) => [s.id, s.source.line]),
      [
        ["intro", 17],
        ["scene-002", 28],
        ["closing", 38],
      ],
    );
  });

  it("reports a duplicate id on the later scene with both lines and exits 1", () => {
    const run = video(["validate", copyProject("scene-lines-error")]);
    assert.equal(run.status, 1);
    assert.equal(
      run.stderr,
      'ERROR index.qmd:17\nScene id "intro" is used on line 9 and line 17.\nGive one of the scenes another id, for example #intro-2.\n',
    );
  });

  it("reports each invalid id with its line and a suggestion", () => {
    const run = video([
      "validate",
      "--json",
      copyProject("scene-lines-invalid-id"),
    ]);
    assert.equal(run.status, 1);
    const list = diagnosticsOf(run.stdout);
    assert.deepEqual(
      list.map((d) => [d.code, d.line, d.suggestion]),
      [
        [
          "E_SCENE_ID_INVALID",
          13,
          "Use #intro; ids start with a letter and use lowercase letters, digits and hyphens.",
        ],
        [
          "E_SCENE_ID_INVALID",
          17,
          "Use #scene-1; ids start with a letter and use lowercase letters, digits and hyphens.",
        ],
      ],
    );
  });

  it("gives the line of a nested scene", () => {
    const run = video([
      "validate",
      "--json",
      copyProject("diagnostics-nested"),
    ]);
    const [error] = diagnosticsOf(run.stdout);
    assert.equal(error?.code, "E_SCENE_NESTED");
    assert.equal(error?.line, 11);
  });
});
