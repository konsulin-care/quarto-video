// The `statement` component through the real `video` bin (task 025; PRD §5.4 (2),
// §5.5, §9.2). component-statement-invalid has one error per violating scene:
// each must yield exactly the code, line and scene id of its expected.json, with
// a suggestion. component-statement-warn yields only its warnings (exit 0), and
// component-statement and -small are valid.
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
const SCRATCH = mkdtempSync(join(tmpdir(), "video-statement-"));
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

/** Copies a fixture's index.qmd to a scratch project and returns its root. */
function copyFixture(fixture: string): string {
  const root = join(SCRATCH, fixture);
  mkdirSync(root, { recursive: true });
  writeFileSync(
    join(root, "index.qmd"),
    readFileSync(join(FIXTURES, fixture, "index.qmd"), "utf8"),
  );
  return root;
}

function expectedOf(fixture: string): Array<Record<string, unknown>> {
  return JSON.parse(
    readFileSync(join(FIXTURES, fixture, "expected.json"), "utf8"),
  ) as Array<Record<string, unknown>>;
}

describe("component statement fixtures", () => {
  it("is listed by `video components statement` with its slot and bounds", () => {
    const run = video(["components"]);
    assert.equal(run.status, 0, run.stderr);
    const row = run.stdout
      .split("\n")
      .find((line) => line.startsWith("statement "));
    assert.ok(row, `no statement row in:\n${run.stdout}`);
    assert.match(row, /1s-30s/);
    assert.match(row, /default \(required: paragraph, heading\)/);
  });

  it("component-statement validates with the OK line and exit 0", () => {
    const run = video(["validate", copyFixture("component-statement")]);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stdout, "OK component-statement (5 scenes, 450 frames)\n");
  });

  it("component-statement-small validates with no warnings", () => {
    const run = video(["validate", copyFixture("component-statement-small")]);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(
      run.stdout,
      "OK component-statement-small (2 scenes, 120 frames)\n",
    );
  });

  it("component-statement-invalid yields exactly the codes, lines and scene ids of expected.json", () => {
    const run = video([
      "validate",
      "--json",
      copyFixture("component-statement-invalid"),
    ]);
    assert.equal(run.status, 1, run.stderr);
    const actual = JSON.parse(run.stdout) as Array<Record<string, unknown>>;
    assert.deepEqual(
      actual.map((d) => Object.fromEntries(KEYS.map((k) => [k, d[k]]))),
      expectedOf("component-statement-invalid"),
    );
    for (const diagnostic of actual) {
      assert.equal(diagnostic["severity"], "error");
      assert.ok(
        String(diagnostic["suggestion"] ?? "") !== "",
        `no suggestion for ${String(diagnostic["code"])}`,
      );
    }
  });

  it("component-statement-warn yields its warnings only, and exits 0", () => {
    const run = video([
      "validate",
      "--json",
      copyFixture("component-statement-warn"),
    ]);
    assert.equal(run.status, 0, run.stderr);
    const actual = JSON.parse(run.stdout) as Array<Record<string, unknown>>;
    assert.deepEqual(
      actual.map((d) => Object.fromEntries(KEYS.map((k) => [k, d[k]]))),
      expectedOf("component-statement-warn"),
    );
    for (const diagnostic of actual) {
      assert.equal(diagnostic["severity"], "warning");
    }
  });
});
