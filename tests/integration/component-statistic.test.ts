// The `statistic` component through the real `video` bin (task 031; PRD §5.4 (4),
// §5.5, §9.2, ADR-0015). component-statistic-invalid has one scene per contract
// violation: each must yield exactly the code, line and scene id of its
// expected.json, one error per scene. component-statistic is valid and must
// pass stage 2 with its scene and frame count. `value="abc"` is E_PROP_TYPE.
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
const SCRATCH = mkdtempSync(join(tmpdir(), "video-statistic-"));
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
function copyFixture(fixture: string, index = "index.qmd"): string {
  const root = join(SCRATCH, fixture);
  mkdirSync(root, { recursive: true });
  writeFileSync(
    join(root, "index.qmd"),
    readFileSync(join(FIXTURES, fixture, index), "utf8"),
  );
  return root;
}

/** The validator's diagnostics for `source` (a document text), as JSON. */
function diagnosticsOf(source: string): Array<Record<string, unknown>> {
  const root = mkdtempSync(join(SCRATCH, "inline-"));
  writeFileSync(join(root, "index.qmd"), source);
  const run = video(["validate", "--json", root]);
  return JSON.parse(run.stdout) as Array<Record<string, unknown>>;
}

describe("component statistic fixtures", () => {
  it("component-statistic validates with the OK line and exit 0", () => {
    const run = video(["validate", copyFixture("component-statistic")]);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stdout, "OK component-statistic (4 scenes, 390 frames)\n");
  });

  it("component-statistic-invalid yields exactly the codes, lines and scene ids of expected.json", () => {
    const expected = JSON.parse(
      readFileSync(
        join(FIXTURES, "component-statistic-invalid", "expected.json"),
        "utf8",
      ),
    ) as Array<Record<string, unknown>>;
    const run = video([
      "validate",
      "--json",
      copyFixture("component-statistic-invalid"),
    ]);
    assert.equal(run.status, 1, run.stderr);
    const actual = JSON.parse(run.stdout) as Array<Record<string, unknown>>;
    assert.deepEqual(
      actual.map((d) => Object.fromEntries(KEYS.map((k) => [k, d[k]]))),
      expected,
    );
    assert.equal(actual.length, 11, "one error per violating scene");
    for (const diagnostic of actual) {
      assert.ok(
        String(diagnostic["suggestion"] ?? "") !== "",
        `no suggestion for ${String(diagnostic["code"])}`,
      );
    }
  });

  it('value="abc" is a type error (E_PROP_TYPE) that names the prop and the text', () => {
    const [found] = diagnosticsOf(
      [
        "---",
        'title: "t"',
        "video:",
        "  width: 640",
        "  height: 360",
        "  fps: 30",
        "---",
        "",
        '::: {.scene component="statistic" duration="2s" value="abc"}',
        "::: {.label}",
        "Text",
        ":::",
        ":::",
        "",
      ].join("\n"),
    );
    assert.equal(found?.["code"], "E_PROP_TYPE");
    assert.equal(
      found?.["message"],
      'Prop "value" of component "statistic" is "abc"; it must be a number.',
    );
    assert.equal(found?.["line"], 9);
  });

  it("a value of 1e9 is accepted and carried as a JSON number", () => {
    const run = video([
      "validate",
      "--print-ir",
      copyFixture("component-statistic"),
    ]);
    assert.equal(run.status, 0, run.stderr);
    const ir = JSON.parse(run.stdout.slice(run.stdout.indexOf("{"))) as {
      scenes: Array<{ props?: Record<string, unknown> }>;
    };
    assert.equal(ir.scenes[1]?.props?.["value"], 1000000000);
    assert.equal(ir.scenes[2]?.props?.["unit"], "M");
  });
});

describe("statistic in the component list", () => {
  it("video components lists statistic with its slots and duration bounds", () => {
    const run = video(["components"]);
    assert.equal(run.status, 0, run.stderr);
    const row = run.stdout
      .split("\n")
      .find((line) => line.startsWith("statistic "));
    assert.ok(row, `no statistic row in:\n${run.stdout}`);
    assert.match(row, /100ms-30s/);
    assert.match(
      row,
      /context \(optional: paragraph\); label \(required: paragraph\)/,
    );
  });

  it("video components --json describes the number props", () => {
    const run = video(["components", "--json"]);
    assert.equal(run.status, 0, run.stderr);
    const list = JSON.parse(run.stdout) as Array<Record<string, unknown>>;
    const statistic = list.find((c) => c["id"] === "statistic");
    assert.ok(statistic, "statistic is listed");
    assert.deepEqual(statistic["props"], {
      value: { type: "number", required: true, min: -1e15, max: 1e15 },
      unit: { type: "string" },
      prefix: { type: "string" },
      decimals: { type: "number", integer: true, min: 0, max: 6, default: 0 },
    });
  });
});
