// The `section-divider` component through the real `video` bin (task 029; PRD
// §5.4 (11), §5.5, §9.2). component-section-divider-invalid has one scene per
// contract violation: each must yield exactly the code, line and scene id of its
// expected.json, one error per scene. component-section-divider is valid and
// must pass stage 2.
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
const SCRATCH = mkdtempSync(join(tmpdir(), "video-divider-"));
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

describe("component section-divider", () => {
  it("is listed by video components with its slots and bounds", () => {
    const run = video(["components", "--json"]);
    assert.equal(run.status, 0, run.stderr);
    const list = JSON.parse(run.stdout) as Array<Record<string, unknown>>;
    const divider = list.find((c) => c["id"] === "section-divider");
    assert.ok(divider, "section-divider is listed");
    assert.deepEqual(divider["slots"], {
      default: { required: true, accepts: ["paragraph", "heading"] },
      kicker: { required: false, accepts: ["paragraph"] },
    });
    assert.deepEqual(divider["duration"], { minMs: 100, maxMs: 8000 });
  });

  it("component-section-divider validates with the OK line and exit 0", () => {
    const run = video(["validate", copyFixture("component-section-divider")]);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(
      run.stdout,
      "OK component-section-divider (4 scenes, 360 frames)\n",
    );
  });

  it("component-section-divider-invalid yields exactly the codes, lines and scene ids of expected.json", () => {
    const expected = JSON.parse(
      readFileSync(
        join(FIXTURES, "component-section-divider-invalid", "expected.json"),
        "utf8",
      ),
    ) as Array<Record<string, unknown>>;
    const run = video([
      "validate",
      "--json",
      copyFixture("component-section-divider-invalid"),
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
});
