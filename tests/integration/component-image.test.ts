// The `image` component through the real `video` bin (task 033; PRD §5.4 (6),
// §5.5, §9.2). component-image and component-image-animations are valid.
// component-image-invalid has one stage 2 violation per scene and
// component-image-block-invalid one stage 1 shape violation per scene; each
// must yield exactly the code, line and scene id of its expected.json.
// component-image-missing-asset names a file that is not there (stage 3).
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
const SCRATCH = mkdtempSync(join(tmpdir(), "video-image-"));
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

/** The diagnostics of an invalid fixture, reduced to the keys its expected.json lists. */
function diagnosticsOf(fixture: string): Array<Record<string, unknown>> {
  const run = video(["validate", "--json", copyFixture(fixture)]);
  assert.equal(run.status, 1, run.stderr);
  const actual = JSON.parse(run.stdout) as Array<Record<string, unknown>>;
  for (const diagnostic of actual) {
    assert.ok(
      String(diagnostic["suggestion"] ?? "") !== "",
      `no suggestion for ${String(diagnostic["code"])}`,
    );
  }
  return actual.map((d) => Object.fromEntries(KEYS.map((k) => [k, d[k]])));
}

describe("component image", () => {
  it("is listed by video components with its slots", () => {
    const run = video(["components"]);
    assert.equal(run.status, 0, run.stderr);
    const row = run.stdout
      .split("\n")
      .find((line) => line.startsWith("image "));
    assert.ok(row, `no image row in:\n${run.stdout}`);
    assert.match(
      row,
      /caption \(optional: paragraph\); default \(required: image\)/,
    );
  });

  it("component-image validates with the OK line and exit 0", () => {
    const run = video(["validate", copyFixture("component-image")]);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stdout, "OK component-image (7 scenes, 420 frames)\n");
  });

  it("component-image-animations validates with every compatible animation", () => {
    const run = video(["validate", copyFixture("component-image-animations")]);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(
      run.stdout,
      "OK component-image-animations (3 scenes, 180 frames)\n",
    );
  });

  it("component-image-invalid yields exactly the codes, lines and scene ids of expected.json", () => {
    const expected = JSON.parse(
      readFileSync(
        join(FIXTURES, "component-image-invalid", "expected.json"),
        "utf8",
      ),
    ) as Array<Record<string, unknown>>;
    assert.deepEqual(diagnosticsOf("component-image-invalid"), expected);
  });

  it("component-image-block-invalid yields exactly the codes, lines and scene ids of expected.json", () => {
    const expected = JSON.parse(
      readFileSync(
        join(FIXTURES, "component-image-block-invalid", "expected.json"),
        "utf8",
      ),
    ) as Array<Record<string, unknown>>;
    assert.deepEqual(diagnosticsOf("component-image-block-invalid"), expected);
  });

  it("a missing src file is E_ASSET_MISSING from stage 3, naming the file and scene", () => {
    const run = video([
      "validate",
      "--json",
      copyFixture("component-image-missing-asset"),
    ]);
    assert.equal(run.status, 1, run.stderr);
    const [diagnostic] = JSON.parse(run.stdout) as Array<
      Record<string, unknown>
    >;
    assert.equal(diagnostic?.["code"], "E_ASSET_MISSING");
    assert.equal(diagnostic?.["sceneId"], "scene-001");
    assert.equal(diagnostic?.["line"], 9);
    assert.equal(diagnostic?.["assetPath"], "assets/missing.png");
  });
});
