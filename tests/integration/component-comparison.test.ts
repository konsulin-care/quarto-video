// The `comparison` component through the real `video` bin (task 034; PRD §5.4 (5),
// §5.5, §9.2). component-comparison-invalid has one scene per contract violation:
// each must yield exactly the code, line and scene id of its expected.json, one
// error per scene. component-comparison is valid and must pass stage 2, and
// `video components` must list it with its slots.
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
const SCRATCH = mkdtempSync(join(tmpdir(), "video-comparison-"));
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

describe("component comparison fixtures", () => {
  it("component-comparison validates with the OK line and exit 0", () => {
    const run = video(["validate", copyFixture("component-comparison")]);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(
      run.stdout,
      "OK component-comparison (4 scenes, 480 frames)\n",
    );
  });

  it("component-comparison-invalid yields exactly the codes, lines and scene ids of expected.json", () => {
    const expected = JSON.parse(
      readFileSync(
        join(FIXTURES, "component-comparison-invalid", "expected.json"),
        "utf8",
      ),
    ) as Array<Record<string, unknown>>;
    const run = video([
      "validate",
      "--json",
      copyFixture("component-comparison-invalid"),
    ]);
    assert.equal(run.status, 1, run.stderr);
    const actual = JSON.parse(run.stdout) as Array<Record<string, unknown>>;
    assert.deepEqual(
      actual.map((d) => Object.fromEntries(KEYS.map((k) => [k, d[k]]))),
      expected,
    );
    for (const diagnostic of actual) {
      assert.ok(
        String(diagnostic["suggestion"] ?? "") !== "",
        `no suggestion for ${String(diagnostic["code"])}`,
      );
    }
  });

  it("lists comparison with its slots and duration in video components --json", () => {
    const run = video(["components", "--json"]);
    assert.equal(run.status, 0, run.stderr);
    const list = JSON.parse(run.stdout) as Array<Record<string, unknown>>;
    const comparison = list.find((c) => c["id"] === "comparison");
    assert.ok(comparison, "comparison is listed");
    assert.deepEqual(comparison["slots"], {
      left: { required: true, accepts: ["heading", "paragraph", "list"] },
      middle: { required: false, accepts: ["heading", "paragraph", "list"] },
      right: { required: true, accepts: ["heading", "paragraph", "list"] },
    });
    assert.deepEqual(comparison["duration"], { minMs: 100, maxMs: 30000 });
  });
});
