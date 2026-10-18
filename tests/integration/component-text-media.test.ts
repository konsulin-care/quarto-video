// The text-media component through the real `video` bin (task 042; PRD §5.4 (8),
// §6.1 (2)). component-text-media validates with no warning; component-text-media-invalid
// has one violation per scene and must yield exactly the codes, lines and scene ids
// of its expected.json.
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";
import { strict as assert } from "node:assert";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN_DIR = join(ROOT, "node_modules", ".bin");
const FIXTURES = join(ROOT, "tests", "fixtures", "projects");
const SCRATCH = mkdtempSync(join(tmpdir(), "video-text-media-"));
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

describe("component text-media", () => {
  it("is listed by video components with its text slot and side prop", () => {
    const run = video(["components"]);
    assert.equal(run.status, 0, run.stderr);
    const row = run.stdout
      .split("\n")
      .find((line) => line.startsWith("text-media "));
    assert.ok(row, `no text-media row in:\n${run.stdout}`);
    assert.match(row, /text \(required: paragraph, heading\)/);
    assert.match(row, /side/);
  });

  it("component-text-media validates with no warning and exit 0", () => {
    const run = video(["validate", copyFixture("component-text-media")]);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(
      run.stdout,
      "OK component-text-media (4 scenes, 300 frames)\n",
    );
  });

  it("component-text-media-invalid yields exactly the codes, lines and scene ids of expected.json", () => {
    const expected = JSON.parse(
      readFileSync(
        join(FIXTURES, "component-text-media-invalid", "expected.json"),
        "utf8",
      ),
    ) as Array<Record<string, unknown>>;
    const run = video([
      "validate",
      "--json",
      copyFixture("component-text-media-invalid"),
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

  it("names the framed placement a text-media scene takes, and the background takers", () => {
    const run = video([
      "validate",
      copyFixture("component-text-media-invalid"),
    ]);
    assert.match(run.stderr, /Add one \.video block with placement "framed"/);
    assert.match(
      run.stderr,
      /Components that take "background" footage: statement, title\./,
    );
  });
});
