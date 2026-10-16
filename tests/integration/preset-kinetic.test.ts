// The `kinetic` preset through the real `video` bin (task 026; PRD §5.6). The
// valid fixtures pass stage 2 with no diagnostics. kinetic-fallback has a
// 40-word statement: it must yield the W_ANIMATION_FALLBACK warning on its line
// (and the text-fit warning its size causes) and nothing else, exit 0.
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
const SCRATCH = mkdtempSync(join(tmpdir(), "video-kinetic-"));
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

describe("preset kinetic fixtures", () => {
  it("preset-kinetic validates with no diagnostics", () => {
    const run = video(["validate", copyFixture("preset-kinetic")]);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stdout, "OK preset-kinetic (2 scenes, 120 frames)\n");
  });

  it("reduced-motion-kinetic validates with no diagnostics", () => {
    const run = video(["validate", copyFixture("reduced-motion-kinetic")]);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(
      run.stdout,
      "OK reduced-motion-kinetic (2 scenes, 120 frames)\n",
    );
  });

  it("kinetic-fallback yields exactly the codes, lines and scene ids of expected.json, exit 0", () => {
    const expected = JSON.parse(
      readFileSync(join(FIXTURES, "kinetic-fallback", "expected.json"), "utf8"),
    ) as Array<Record<string, unknown>>;
    const run = video(["validate", "--json", copyFixture("kinetic-fallback")]);
    assert.equal(run.status, 0, run.stderr);
    const actual = JSON.parse(run.stdout) as Array<Record<string, unknown>>;
    assert.deepEqual(
      actual.map((d) => Object.fromEntries(KEYS.map((k) => [k, d[k]]))),
      expected,
    );
    assert.ok(
      actual.every((d) => d["severity"] === "warning"),
      "the fallback is a warning, not an error",
    );
  });
});
