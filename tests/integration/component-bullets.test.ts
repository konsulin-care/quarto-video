// The `bullets` component through the real `video` bin (task 027; PRD §5.4 (3),
// §5.5, §9.2). component-bullets-invalid has one scene per contract violation:
// each must yield exactly the code, line and scene id of its expected.json, one
// error per scene. component-bullets is valid and must pass stage 2.
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
const SCRATCH = mkdtempSync(join(tmpdir(), "video-bullets-"));
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
function copyFixture(fixture: string, index?: string): string {
  const root = join(SCRATCH, fixture);
  mkdirSync(root, { recursive: true });
  const text =
    index ?? readFileSync(join(FIXTURES, fixture, "index.qmd"), "utf8");
  writeFileSync(join(root, "index.qmd"), text);
  return root;
}

describe("component bullets fixtures", () => {
  it("lists bullets with its slots, props and duration bounds", () => {
    const run = video(["components", "--json"]);
    assert.equal(run.status, 0, run.stderr);
    const list = JSON.parse(run.stdout) as Array<Record<string, unknown>>;
    const bullets = list.find((c) => c["id"] === "bullets");
    assert.ok(bullets, "bullets is listed");
    assert.deepEqual(bullets["slots"], {
      default: {
        required: true,
        accepts: ["list"],
        items: { minItems: 2, maxItems: 6 },
      },
      heading: { required: false, accepts: ["heading"] },
    });
    assert.deepEqual(bullets["props"], {});
    assert.deepEqual(bullets["duration"], { minMs: 1000, maxMs: 30000 });
  });

  it("component-bullets validates with the OK line and exit 0", () => {
    const run = video(["validate", copyFixture("component-bullets")]);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stdout, "OK component-bullets (5 scenes, 450 frames)\n");
  });

  it("component-bullets-invalid yields exactly the codes, lines and scene ids of expected.json", () => {
    const expected = JSON.parse(
      readFileSync(
        join(FIXTURES, "component-bullets-invalid", "expected.json"),
        "utf8",
      ),
    ) as Array<Record<string, unknown>>;
    const run = video([
      "validate",
      "--json",
      copyFixture("component-bullets-invalid"),
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

  it("a 7-item list is E_SLOT_CONSTRAINT and the message gives the limit", () => {
    const seven = [
      '::: {.scene component="bullets" duration="2s"}',
      "- 1",
      "- 2",
      "- 3",
      "- 4",
      "- 5",
      "- 6",
      "- 7",
      ":::",
      "",
    ].join("\n");
    const run = video([
      "validate",
      "--json",
      copyFixture("bullets-seven", seven),
    ]);
    assert.equal(run.status, 1, run.stderr);
    const actual = JSON.parse(run.stdout) as Array<Record<string, unknown>>;
    assert.equal(actual.length, 1);
    assert.equal(actual[0]?.["code"], "E_SLOT_CONSTRAINT");
    assert.match(
      String(actual[0]?.["message"]),
      /7 items; the limit is 2 to 6 items/,
    );
  });
});
