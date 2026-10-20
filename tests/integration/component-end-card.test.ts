// The `end-card` component through the real `video` bin (task 030; PRD §5.4 (12),
// §5.5, §9.2). component-end-card-invalid has one scene per contract violation:
// each must yield exactly the code, line and scene id of its expected.json, one
// error per scene. component-end-card is valid and must pass stage 2.
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
const SCRATCH = mkdtempSync(join(tmpdir(), "video-end-card-"));
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

describe("component end-card fixtures", () => {
  it("component-end-card validates with the OK line and exit 0", () => {
    const run = video(["validate", copyFixture("component-end-card")]);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stdout, "OK component-end-card (3 scenes, 300 frames)\n");
  });

  it("component-end-card-invalid yields exactly the codes, lines and scene ids of expected.json", () => {
    const expected = JSON.parse(
      readFileSync(
        join(FIXTURES, "component-end-card-invalid", "expected.json"),
        "utf8",
      ),
    ) as Array<Record<string, unknown>>;
    const run = video([
      "validate",
      "--json",
      copyFixture("component-end-card-invalid"),
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

  it("video components lists end-card with its slots, animations and bounds", () => {
    const run = video(["components", "--json"]);
    assert.equal(run.status, 0, run.stderr);
    const list = JSON.parse(run.stdout) as Array<Record<string, unknown>>;
    const card = list.find((c) => c["id"] === "end-card");
    assert.ok(card, "end-card is listed");
    assert.deepEqual(card["slots"], {
      default: { required: true, accepts: ["paragraph", "heading"] },
      cta: { required: false, accepts: ["paragraph"] },
      credits: { required: false, accepts: ["list"] },
    });
    assert.deepEqual(card["props"], {});
    assert.deepEqual(card["duration"], { minMs: 100, maxMs: 30000 });
    assert.deepEqual(card["compatibleAnimations"], [
      "fade-in",
      "fade-out",
      "reveal",
      "slide-up",
      "stagger",
    ]);
  });
});
