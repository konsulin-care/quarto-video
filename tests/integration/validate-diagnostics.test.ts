// `video validate` diagnostics through the real bin: the PRD §9.2 human format,
// `--json` checked against schema/diagnostic.json, and one fixture per error
// family (task 008; packages/validator/README.md). Fixtures are copied to a
// scratch dir, so the filter's .video-build never lands in tests/fixtures.
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
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
import { parseDiagnostics, type Diagnostic } from "@quarto-video/validator";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN_DIR = join(ROOT, "node_modules", ".bin");
const FIXTURES = join(ROOT, "tests", "fixtures", "projects");
const SCRATCH = mkdtempSync(join(tmpdir(), "video-diagnostics-"));

interface Run {
  status: number | null;
  stdout: string;
  stderr: string;
}

/** Runs the installed `video` bin from `cwd`. */
function video(args: string[], cwd: string = ROOT): Run {
  const result = spawnSync(join(BIN_DIR, "video"), args, {
    cwd,
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

/** Copies a fixture's index.qmd to SCRATCH/<name> and returns that project. */
function copyProject(fixture: string, name: string = fixture): string {
  const root = join(SCRATCH, name, fixture);
  mkdirSync(root, { recursive: true });
  copyFileSync(join(FIXTURES, fixture, "index.qmd"), join(root, "index.qmd"));
  return root;
}

/** Sets the first scene's duration attribute in the copied project. */
function setFirstDuration(project: string, duration: string): void {
  const file = join(project, "index.qmd");
  writeFileSync(
    file,
    readFileSync(file, "utf8").replace(
      'duration="4s"',
      `duration="${duration}"`,
    ),
  );
}

/** Parses `stdout` as a diagnostics array, which must validate against the schema. */
function diagnosticsOf(stdout: string): Diagnostic[] {
  const list = parseDiagnostics(stdout);
  assert.ok(list, `stdout is not a valid diagnostics array:\n${stdout}`);
  return list;
}

after(() => rmSync(SCRATCH, { recursive: true, force: true }));

describe("video validate diagnostics", () => {
  it("prints the PRD §9.2 block for a scene without a component and exits 1", () => {
    const run = video(["validate", copyProject("diagnostics-no-component")]);
    assert.equal(run.status, 1);
    assert.equal(run.stdout, "");
    assert.equal(
      run.stderr,
      'ERROR index.qmd\nScene "scene-002" has no component attribute.\nAdd component="<name>"\n',
    );
  });

  it("prints the same error as a JSON array with --json and exits 1", () => {
    const run = video([
      "validate",
      "--json",
      copyProject("diagnostics-no-component"),
    ]);
    assert.equal(run.status, 1);
    assert.equal(run.stderr, "");
    const list = diagnosticsOf(run.stdout);
    assert.equal(list.length, 1);
    const [error] = list;
    assert.equal(error?.code, "E_SCENE_NO_COMPONENT");
    assert.equal(error?.severity, "error");
    assert.equal(error?.sceneId, "scene-002");
    assert.equal(error?.suggestion, 'Add component="<name>"');
    assert.equal(error?.file, "index.qmd");
  });

  it("reports every bad scene in one run, in document order", () => {
    const run = video([
      "validate",
      "--json",
      copyProject("diagnostics-multiple"),
    ]);
    assert.equal(run.status, 1);
    const list = diagnosticsOf(run.stdout);
    assert.deepEqual(
      list.map((d) => [d.code, d.sceneId]),
      [
        ["E_SCENE_NO_DURATION", "scene-001"],
        ["E_DURATION_SYNTAX", "scene-002"],
        ["E_SCENE_SHAPE", "scene-003"],
      ],
    );
  });

  it("reports front matter problems as E_SETTING_* with the property", () => {
    const run = video([
      "validate",
      "--json",
      copyProject("diagnostics-settings"),
    ]);
    assert.equal(run.status, 1);
    const list = diagnosticsOf(run.stdout);
    assert.deepEqual(
      list.map((d) => [d.code, d.property]),
      [
        ["E_SETTING_MISSING", "video.fps"],
        ["E_SETTING_INVALID", "video.output"],
      ],
    );
  });

  it("reports a .scene inside another block as E_SCENE_NESTED", () => {
    const run = video([
      "validate",
      "--json",
      copyProject("diagnostics-nested"),
    ]);
    assert.equal(run.status, 1);
    const list = diagnosticsOf(run.stdout);
    assert.equal(list[0]?.code, "E_SCENE_NESTED");
    assert.equal(list.length, 1);
  });

  it("reports a zero duration as E_DURATION_RANGE with its scene", () => {
    const run = video(["validate", copyProject("diagnostics-zero-duration")]);
    assert.equal(run.status, 1);
    assert.equal(
      run.stderr,
      'ERROR index.qmd\nScene "scene-001" has duration "0s", which must be greater than zero.\nUse a positive duration, for example duration="1s".\n',
    );
  });

  it("prints the same human block for render and exits 1 before rendering", () => {
    const run = video(["render", copyProject("cli-render-invalid")]);
    assert.equal(run.status, 1);
    assert.equal(run.stdout, "");
    assert.equal(
      run.stderr,
      'ERROR index.qmd\nScene "scene-001" has duration "0s", which must be greater than zero.\nUse a positive duration, for example duration="1s".\n',
    );
  });

  it("prints the diagnostics as a JSON array on stdout for render --json and exits 1", () => {
    const run = video(["render", "--json", copyProject("cli-render-invalid")]);
    assert.equal(run.status, 1);
    assert.equal(run.stderr, "");
    const [error] = diagnosticsOf(run.stdout);
    assert.equal(error?.code, "E_DURATION_RANGE");
    assert.equal(error?.sceneId, "scene-001");
  });

  it("writes the frames of a fractional duration to the IR", () => {
    const project = copyProject("minimal-filter", "fractional-duration");
    setFirstDuration(project, "1.5s");
    const run = video(["validate", "--print-ir", project]);
    assert.equal(run.status, 0, run.stderr);
    const ir = JSON.parse(run.stdout) as {
      scenes: { durationFrames: number }[];
    };
    assert.equal(ir.scenes[0]?.durationFrames, 45);
  });

  it("names the scene and the value for a negative duration as E_DURATION_RANGE", () => {
    const project = copyProject("minimal-filter", "negative-duration");
    setFirstDuration(project, "-1s");
    const run = video(["validate", "--json", project]);
    assert.equal(run.status, 1);
    const [error] = diagnosticsOf(run.stdout);
    assert.equal(error?.code, "E_DURATION_RANGE");
    assert.equal(error?.sceneId, "scene-001");
    assert.equal(
      error?.message,
      'Scene "scene-001" has duration "-1s", which must be greater than zero.',
    );
  });

  it("reports a filter that fails without diagnostics as E_FILTER_FAILED", () => {
    const project = copyProject("minimal-filter", "blocked-build");
    // A file where the build directory should be makes the filter fail to write.
    writeFileSync(join(project, ".video-build"), "blocked\n");
    const run = video(["validate", "--json", project]);
    assert.equal(run.status, 1);
    const [error] = diagnosticsOf(run.stdout);
    assert.equal(error?.code, "E_FILTER_FAILED");
    assert.equal(error?.file, "index.qmd");
  });

  it("prints [] with --json for a valid project and exits 0", () => {
    const run = video(["validate", "--json", copyProject("minimal-filter")]);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stdout, "[]\n");
    assert.equal(run.stderr, "");
  });

  it("exits 2 when --print-ir and --json are combined", () => {
    const run = video([
      "validate",
      "--print-ir",
      "--json",
      copyProject("minimal-filter"),
    ]);
    assert.equal(run.status, 2);
    assert.match(run.stderr, /^usage: video validate/);
  });
});
