// Front matter settings and defaults through the real `video` bin (task 010;
// PRD §5.2). Fixtures are copied to a scratch dir, so the filter's
// .video-build never lands in tests/fixtures. Each fixture's expected.json is
// the IR (defaults and overrides) or the diagnostics array (errors).
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";
import { strict as assert } from "node:assert";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN_DIR = join(ROOT, "node_modules", ".bin");
const FIXTURES = join(ROOT, "tests", "fixtures", "projects");
const SCRATCH = mkdtempSync(join(tmpdir(), "video-front-matter-"));

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
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

/** Copies a fixture's index.qmd to a scratch project and returns its directory. */
function copyProject(fixture: string): string {
  const root = join(SCRATCH, fixture);
  mkdirSync(root, { recursive: true });
  copyFileSync(join(FIXTURES, fixture, "index.qmd"), join(root, "index.qmd"));
  return root;
}

/** The fixture's expected.json, parsed. */
function expected(fixture: string): unknown {
  return JSON.parse(
    readFileSync(join(FIXTURES, fixture, "expected.json"), "utf8"),
  );
}

after(() => rmSync(SCRATCH, { recursive: true, force: true }));

describe("front matter settings and defaults", () => {
  it("builds an IR with every default from an empty front matter", () => {
    const run = video([
      "validate",
      "--print-ir",
      copyProject("front-matter-empty"),
    ]);
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual(JSON.parse(run.stdout), expected("front-matter-empty"));
  });

  it("applies defaults.scene.duration to scenes without a duration; an explicit duration wins", () => {
    const run = video([
      "validate",
      "--print-ir",
      copyProject("front-matter-defaults"),
    ]);
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual(JSON.parse(run.stdout), expected("front-matter-defaults"));
  });

  it("reflects each overridden setting in the IR and recomputes frames at the new fps", () => {
    const run = video([
      "validate",
      "--print-ir",
      copyProject("front-matter-overrides"),
    ]);
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual(
      JSON.parse(run.stdout),
      expected("front-matter-overrides"),
    );
  });

  it("writes video.reducedMotion to the IR settings (IR 1.2)", () => {
    const run = video([
      "validate",
      "--print-ir",
      copyProject("front-matter-reduced-motion"),
    ]);
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual(
      JSON.parse(run.stdout),
      expected("front-matter-reduced-motion"),
    );
  });

  it("rejects a quoted video.reducedMotion as E_SETTING_INVALID, exit 1", () => {
    const run = video([
      "validate",
      "--json",
      copyProject("front-matter-reduced-motion-invalid"),
    ]);
    assert.equal(run.status, 1);
    assert.deepEqual(
      JSON.parse(run.stdout),
      expected("front-matter-reduced-motion-invalid"),
    );
  });

  it("names the misspelt key and suggests width as E_CONFIG_UNKNOWN_KEY, exit 1", () => {
    const project = copyProject("diagnostics-unknown-key");
    const human = video(["validate", project]);
    assert.equal(human.status, 1);
    assert.equal(human.stdout, "");
    assert.equal(
      human.stderr,
      'ERROR index.qmd\nUnknown front matter key "video.widht".\nDid you mean "width"?\n',
    );
    const json = video(["validate", "--json", project]);
    assert.equal(json.status, 1);
    assert.deepEqual(
      JSON.parse(json.stdout),
      expected("diagnostics-unknown-key"),
    );
  });

  it("reports every invalid value in one run, exit 1, and writes no IR", () => {
    const project = copyProject("front-matter-invalid");
    const run = video(["validate", "--json", project]);
    assert.equal(run.status, 1);
    assert.deepEqual(JSON.parse(run.stdout), expected("front-matter-invalid"));
    assert.equal(
      existsSync(join(project, ".video-build", "manifest.json")),
      false,
    );
  });
});
