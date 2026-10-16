// The `chart` component through the real `video` bin (task 035; PRD §5.4 (7),
// §12, ADR-0014). component-chart is valid and passes every stage.
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

  it("hands the renderer the validated IR, with each chart's CSV tables", () => {
    // `video render` passes the validated IR (tables resolved, ADR-0014) to the
    // renderer. A stub renderer reads that IR, then fails the render on purpose.
    const root = copyFixture("component-chart");
    const script = join(SCRATCH, "render-stub.ts");
    writeFileSync(
      script,
      [
        `import { readFileSync } from "node:fs";`,
        `import { runRender } from ${JSON.stringify(join(ROOT, "packages", "cli", "src", "commands", "render.ts"))};`,
        `void runRender({ path: ${JSON.stringify(root)}, browserExecutable: null, json: false }, ${JSON.stringify(root)}, async (irPath) => {`,
        `  const ir = JSON.parse(readFileSync(irPath, "utf8"));`,
        `  console.log("TABLES " + JSON.stringify(ir.scenes.map((s) => Object.keys(s.tables ?? {}))));`,
        `  throw new Error("stub renderer");`,
        `});`,
      ].join("\n"),
    );
    const run = spawnSync(join(BIN_DIR, "tsx"), [script], {
      cwd: ROOT,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${BIN_DIR}${delimiter}${process.env["PATH"] ?? ""}`,
      },
    });
    const line = run.stdout.split("\n").find((l) => l.startsWith("TABLES "));
    assert.deepEqual(JSON.parse(line?.slice(7) ?? "null"), [
      [],
      ["data"],
      ["data"],
      ["data"],
      ["data"],
    ]);
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
