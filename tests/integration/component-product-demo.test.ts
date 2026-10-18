// The product-demo component through the real `video` bin (task 041; PRD §5.4 (9),
// §6.1 (2)). component-product-demo validates; component-product-demo-invalid has
// one violation per scene and must yield exactly the codes, lines and scene ids of
// its expected.json. The frames of the framed clips are in product-demo-frames.test.ts.
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
const SCRATCH = mkdtempSync(join(tmpdir(), "video-product-demo-"));
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

describe("component product-demo", () => {
  it("is listed by video components with its caption slot", () => {
    const run = video(["components"]);
    assert.equal(run.status, 0, run.stderr);
    const row = run.stdout
      .split("\n")
      .find((line) => line.startsWith("product-demo "));
    assert.ok(row, `no product-demo row in:\n${run.stdout}`);
    assert.match(row, /caption \(optional: paragraph\)/);
  });

  it("component-product-demo validates with the OK line and exit 0", () => {
    const run = video(["validate", copyFixture("component-product-demo")]);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(
      run.stdout,
      "OK component-product-demo (4 scenes, 300 frames)\n",
    );
  });

  it("component-product-demo-invalid yields exactly the codes, lines and scene ids of expected.json", () => {
    const expected = JSON.parse(
      readFileSync(
        join(FIXTURES, "component-product-demo-invalid", "expected.json"),
        "utf8",
      ),
    ) as Array<Record<string, unknown>>;
    const run = video([
      "validate",
      "--json",
      copyFixture("component-product-demo-invalid"),
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

  it("names the placements a background-footage error can use instead", () => {
    const run = video([
      "validate",
      copyFixture("component-product-demo-invalid"),
    ]);
    assert.match(
      run.stderr,
      /Components that take "background" footage: statement, title\./,
    );
  });
});
