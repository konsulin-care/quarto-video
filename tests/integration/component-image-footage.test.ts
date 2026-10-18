// Framed image footage through the real `video` bin (IR 1.10, ADR-0018; tasks 041
// and 042 follow-up). component-image-footage is valid: product-demo and text-media
// scenes with a framed still, cover and contain. component-image-footage-invalid
// has one filter error per scene (loop, background placement, audio, no frame) and
// must yield exactly the code, line and scene id of its expected.json. A still is
// checked for existence in stage 3 (E_ASSET_MISSING), and the IR holds `kind`.
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";
import { strict as assert } from "node:assert";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN_DIR = join(ROOT, "node_modules", ".bin");
const FIXTURES = join(ROOT, "tests", "fixtures", "projects");
const SCRATCH = mkdtempSync(join(tmpdir(), "video-image-footage-"));
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
function copyFixture(fixture: string, name = fixture): string {
  const root = join(SCRATCH, name);
  cpSync(join(FIXTURES, fixture), root, { recursive: true });
  return root;
}

describe("framed image footage", () => {
  it("component-image-footage validates with the OK line and exit 0", () => {
    const run = video(["validate", copyFixture("component-image-footage")]);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(
      run.stdout,
      "OK component-image-footage (4 scenes, 240 frames)\n",
    );
  });

  it("writes IR 1.10 with kind image on each still, and no source range or audio", () => {
    const run = video([
      "validate",
      "--print-ir",
      copyFixture("component-image-footage", "ir"),
    ]);
    assert.equal(run.status, 0, run.stderr);
    const ir = JSON.parse(
      run.stdout.slice(0, run.stdout.lastIndexOf("}") + 1),
    ) as {
      schemaVersion: string;
      scenes: { media?: Record<string, unknown>[] }[];
    };
    assert.equal(ir.schemaVersion, "1.10");
    const stills = ir.scenes.flatMap((scene) => scene.media ?? []);
    assert.equal(stills.length, 4);
    for (const still of stills) {
      assert.equal(still["kind"], "image");
      assert.equal(still["placement"], "framed");
      for (const key of [
        "sourceStartFrames",
        "audio",
        "loop",
        "freeze",
        "playbackRate",
      ]) {
        assert.equal(still[key], undefined, key);
      }
    }
  });

  it("component-image-footage-invalid yields exactly the codes, lines and scene ids of expected.json", () => {
    const run = video([
      "validate",
      "--json",
      copyFixture("component-image-footage-invalid", "invalid"),
    ]);
    assert.equal(run.status, 1, run.stderr);
    const actual = JSON.parse(run.stdout) as Record<string, unknown>[];
    const expected = JSON.parse(
      readFileSync(
        join(FIXTURES, "component-image-footage-invalid", "expected.json"),
        "utf8",
      ),
    ) as unknown[];
    assert.deepEqual(
      actual.map((d) => Object.fromEntries(KEYS.map((k) => [k, d[k]]))),
      expected,
    );
    for (const diagnostic of actual) {
      assert.notEqual(String(diagnostic["suggestion"] ?? ""), "", "suggestion");
    }
  });

  it("a still whose file is missing is E_ASSET_MISSING in each scene that uses it", () => {
    const root = copyFixture("component-image-footage", "missing");
    unlinkSync(join(root, "assets", "landscape.jpg"));
    const run = video(["validate", "--json", root]);
    assert.equal(run.status, 1, run.stderr);
    const actual = JSON.parse(run.stdout) as {
      code: string;
      sceneId: string;
    }[];
    assert.deepEqual(
      actual.map((d) => [d.code, d.sceneId]),
      [
        ["E_ASSET_MISSING", "scene-001"],
        ["E_ASSET_MISSING", "scene-003"],
      ],
    );
  });
});
