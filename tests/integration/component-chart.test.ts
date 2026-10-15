// The `chart` component through the real `video` bin (task 035; PRD §5.4 (7),
// §12, ADR-0013). component-chart is valid and passes every stage.
// component-chart-invalid has one contract violation per scene (stage 2);
// component-chart-data-invalid has one data violation per scene (stage 3,
// which runs only after stage 2 passes). Each must yield exactly the code,
// line and scene id of its expected.json, one error per scene.
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  cpSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";
import { strict as assert } from "node:assert";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN_DIR = join(ROOT, "node_modules", ".bin");
const FIXTURES = join(ROOT, "tests", "fixtures", "projects");
const SCRATCH = mkdtempSync(join(tmpdir(), "video-chart-"));
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

/** Copies a fixture (its index.qmd and data/) to a scratch project and returns its root. */
function copyFixture(fixture: string): string {
  const root = join(SCRATCH, fixture);
  mkdirSync(root, { recursive: true });
  writeFileSync(
    join(root, "index.qmd"),
    readFileSync(join(FIXTURES, fixture, "index.qmd"), "utf8"),
  );
  const data = join(FIXTURES, fixture, "data");
  try {
    cpSync(data, join(root, "data"), { recursive: true });
  } catch {
    // A fixture without data/ has nothing to copy.
  }
  return root;
}

function expectedOf(fixture: string): Array<Record<string, unknown>> {
  return JSON.parse(
    readFileSync(join(FIXTURES, fixture, "expected.json"), "utf8"),
  ) as Array<Record<string, unknown>>;
}

describe("component chart fixtures", () => {
  it("component-chart validates with the OK line and exit 0", () => {
    const run = video(["validate", copyFixture("component-chart")]);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stdout, "OK component-chart (5 scenes, 540 frames)\n");
  });

  it("component-chart-invalid yields exactly the contract violations of expected.json", () => {
    const run = video([
      "validate",
      "--json",
      copyFixture("component-chart-invalid"),
    ]);
    assert.equal(run.status, 1, run.stderr);
    const actual = JSON.parse(run.stdout) as Array<Record<string, unknown>>;
    assert.deepEqual(
      actual.map((d) => Object.fromEntries(KEYS.map((k) => [k, d[k]]))),
      expectedOf("component-chart-invalid"),
    );
    for (const diagnostic of actual) {
      assert.ok(
        String(diagnostic["suggestion"] ?? "") !== "",
        `no suggestion for ${String(diagnostic["code"])}`,
      );
    }
  });

  it("component-chart-data-invalid yields the CSV and column errors of expected.json", () => {
    const run = video([
      "validate",
      "--json",
      copyFixture("component-chart-data-invalid"),
    ]);
    assert.equal(run.status, 1, run.stderr);
    const actual = JSON.parse(run.stdout) as Array<Record<string, unknown>>;
    assert.deepEqual(
      actual.map((d) => Object.fromEntries(KEYS.map((k) => [k, d[k]]))),
      expectedOf("component-chart-data-invalid"),
    );
  });

  it("names the available columns and the CSV line in the data errors", () => {
    const run = video([
      "validate",
      "--json",
      copyFixture("component-chart-data-invalid"),
    ]);
    const actual = JSON.parse(run.stdout) as Array<Record<string, unknown>>;
    const column = actual.find((d) => d["code"] === "E_COLUMN_UNKNOWN");
    assert.match(
      String(column?.["message"]),
      /Available columns: region, sales\./,
    );
    const csv = actual.find((d) => d["code"] === "E_CSV_SYNTAX");
    assert.equal(csv?.["file"], "data/broken.csv");
    assert.equal(csv?.["line"], 3);
  });
});
