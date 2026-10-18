// The split-screen component through the real `video` bin (task 043; PRD §5.4 (10),
// §6.1 (3)). component-split-screen validates with no warning;
// component-split-screen-invalid has one violation per scene (scene-002 also
// draws the fourth region, which gives two codes) and must yield exactly the
// codes, lines and scene ids of its expected.json.
import { spawnSync } from "node:child_process";
import {
  cpSync,
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
const SCRATCH = mkdtempSync(join(tmpdir(), "video-split-screen-"));
const KEYS = ["code", "line", "sceneId"] as const;

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

/** Copies a whole fixture (document and assets) to scratch and returns its root. */
function copyFixture(fixture: string): string {
  const root = join(SCRATCH, fixture);
  cpSync(join(FIXTURES, fixture), root, { recursive: true });
  return root;
}

describe("component split-screen", () => {
  it("is listed by video components with its three optional regions", () => {
    const run = video(["components"]);
    assert.equal(run.status, 0, run.stderr);
    const row = run.stdout
      .split("\n")
      .find((line) => line.startsWith("split-screen "));
    assert.ok(row, `no split-screen row in:\n${run.stdout}`);
    assert.match(row, /left \(optional: paragraph, heading\)/);
    assert.match(row, /middle \(optional/);
    assert.match(row, /right \(optional/);
  });

  it("component-split-screen validates with no warning and exit 0", () => {
    const run = video(["validate", copyFixture("component-split-screen")]);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(
      run.stdout,
      "OK component-split-screen (4 scenes, 300 frames)\n",
    );
  });

  it("component-split-screen-invalid yields exactly the codes, lines and scene ids of expected.json", () => {
    const expected = JSON.parse(
      readFileSync(
        join(FIXTURES, "component-split-screen-invalid", "expected.json"),
        "utf8",
      ),
    ) as Array<Record<string, unknown>>;
    const run = video([
      "validate",
      "--json",
      copyFixture("component-split-screen-invalid"),
    ]);
    assert.equal(run.status, 1, run.stderr);
    const actual = JSON.parse(run.stdout) as Array<Record<string, unknown>>;
    for (const diagnostic of actual) {
      assert.ok(
        String(diagnostic["suggestion"] ?? "") !== "",
        `no suggestion for ${String(diagnostic["code"])}`,
      );
    }
    assert.deepEqual(
      actual.map((d) => Object.fromEntries(KEYS.map((k) => [k, d[k]]))),
      expected,
    );
  });

  it("stage 3 checks the footage of each region: a right clip past its file is E_MEDIA_RANGE at its scene", () => {
    const root = copyFixture("component-split-screen");
    const file = join(root, "index.qmd");
    const text = readFileSync(file, "utf8");
    // The right clip (scene 1, line 13) asks for source up to 9 s; the clip is 4 s.
    writeFileSync(
      file,
      text.replace(
        'region="right" fit="contain" sourceStart="0s" sourceEnd="2s"',
        'region="right" fit="contain" sourceStart="0s" sourceEnd="9s"',
      ),
    );
    const run = video(["validate", "--json", root]);
    assert.equal(run.status, 1, run.stderr);
    const actual = JSON.parse(run.stdout) as Array<Record<string, unknown>>;
    assert.deepEqual(
      actual.map((d) => Object.fromEntries(KEYS.map((k) => [k, d[k]]))),
      [{ code: "E_MEDIA_RANGE", line: 13, sceneId: "scene-001" }],
    );
  });

  it("stage 3 checks the footage of each region: a region clip shorter than its scene is E_MEDIA_SHORT_SOURCE", () => {
    const root = copyFixture("component-split-screen");
    const file = join(root, "index.qmd");
    const text = readFileSync(file, "utf8");
    // The middle clip (scene 3, line 28) is 2 s long and the scene is 3 s: without loop it is short.
    writeFileSync(file, text.replace(' loop="true"', ""));
    const run = video(["validate", "--json", root]);
    assert.equal(run.status, 1, run.stderr);
    const actual = JSON.parse(run.stdout) as Array<Record<string, unknown>>;
    assert.deepEqual(
      actual.map((d) => Object.fromEntries(KEYS.map((k) => [k, d[k]]))),
      [{ code: "E_MEDIA_SHORT_SOURCE", line: 28, sceneId: "scene-003" }],
    );
  });

  it("a scene with four regions is an error that names the limit", () => {
    const run = video([
      "validate",
      copyFixture("component-split-screen-invalid"),
    ]);
    assert.match(
      run.stderr,
      /Component "split-screen" takes 2 to 3 regions; this scene uses 4 \(left, middle, right, top\)\./,
    );
  });

  it("footage in a region the component does not have names the valid regions", () => {
    const run = video([
      "validate",
      copyFixture("component-split-screen-invalid"),
    ]);
    assert.match(
      run.stderr,
      /Scene has footage in region "top", which "split-screen" does not have\./,
    );
    assert.match(
      run.stderr,
      /The regions of "split-screen" are: left, middle, right\./,
    );
  });
});
