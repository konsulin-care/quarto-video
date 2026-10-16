// `video validate` through the real bin (packages/cli/bin/video.mjs): exit
// codes, output streams and IR identity (tasks 003, 005; PRD §4.2, §9.1).
// Fixtures are copied into a scratch dir so the test never writes into
// tests/fixtures; the filter's .video-build lands in the copy.
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { validateIr } from "@quarto-video/ir";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN_DIR = join(ROOT, "node_modules", ".bin");
const LAUNCHER = join(ROOT, "packages", "cli", "bin", "video.mjs");
const FIXTURES = join(ROOT, "tests", "fixtures", "projects");
const SCRATCH = mkdtempSync(join(tmpdir(), "video-validate-"));

interface Run {
  status: number | null;
  stdout: string;
  stderr: string;
}

function finish(result: ReturnType<typeof spawnSync<string>>): Run {
  if (result.error !== undefined) throw result.error;
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

/** Runs the installed `video` bin (node_modules/.bin, as `npx video` does). */
function video(args: string[], cwd: string = ROOT): Run {
  return finish(
    spawnSync(join(BIN_DIR, "video"), args, {
      cwd,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${BIN_DIR}${delimiter}${process.env["PATH"] ?? ""}`,
      },
    }),
  );
}

/**
 * Copies `<fixture>/index.qmd` to `<SCRATCH>/<group>/<fixture>/index.qmd` and
 * returns that project directory (its basename is the fixture name).
 */
function copyProject(fixture: string, group: string): string {
  const root = join(SCRATCH, group, fixture);
  mkdirSync(root, { recursive: true });
  copyFileSync(join(FIXTURES, fixture, "index.qmd"), join(root, "index.qmd"));
  return root;
}

function parseIr(stdout: string): unknown {
  return JSON.parse(stdout) as unknown;
}

after(() => rmSync(SCRATCH, { recursive: true, force: true }));

describe("video validate", () => {
  it("prints OK with scene and frame counts for a project directory", () => {
    const project = copyProject("minimal-filter", "dir");
    const run = video(["validate", project]);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stdout, "OK minimal-filter (2 scenes, 240 frames)\n");
    assert.equal(run.stderr, "");
  });

  it("gives identical IR for a project directory and its index.qmd", () => {
    const project = copyProject("minimal-filter", "same-ir");
    const fromDir = video(["validate", "--print-ir", project]);
    const fromFile = video([
      "validate",
      "--print-ir",
      join(project, "index.qmd"),
    ]);
    assert.equal(fromDir.status, 0, fromDir.stderr);
    assert.equal(fromFile.status, 0, fromFile.stderr);
    assert.equal(fromFile.stdout, fromDir.stdout);
    assert.deepEqual(validateIr(parseIr(fromDir.stdout)), {
      ok: true,
      errors: [],
    });
  });

  it("gives identical results from another working directory", () => {
    const project = copyProject("minimal-filter", "cwd");
    const fromRoot = video(["validate", project], ROOT);
    const fromTmp = video(["validate", project], tmpdir());
    const relative = video(
      ["validate", "minimal-filter"],
      join(SCRATCH, "cwd"),
    );
    assert.equal(fromTmp.status, 0, fromTmp.stderr);
    assert.deepEqual(fromTmp, fromRoot);
    assert.deepEqual(relative, fromRoot);
  });

  it("prints only the IR JSON on stdout with --print-ir", () => {
    const project = copyProject("minimal-filter", "print-ir");
    const run = video(["validate", "--print-ir", project]);
    assert.equal(run.status, 0, run.stderr);
    const ir = parseIr(run.stdout) as { scenes: unknown[] };
    assert.equal(ir.scenes.length, 2);
    assert.equal(run.stderr, "OK minimal-filter (2 scenes, 240 frames)\n");
  });

  it("exits 2 and names the path when it does not exist", () => {
    const run = video(["validate", "does/not/exist"], SCRATCH);
    assert.equal(run.status, 2);
    assert.equal(run.stdout, "");
    assert.match(run.stderr, /does\/not\/exist: no such file or directory/);
  });

  it("exits 2 and names the directory when it has no index.qmd", () => {
    const empty = join(SCRATCH, "no-index");
    mkdirSync(empty, { recursive: true });
    const run = video(["validate", empty]);
    assert.equal(run.status, 2);
    assert.equal(run.stdout, "");
    assert.match(run.stderr, new RegExp(`${empty}: no index\\.qmd`));
  });

  it("exits 2 when the path is a file that is not a .qmd document", () => {
    const notes = join(SCRATCH, "notes.txt");
    writeFileSync(notes, "not a document\n");
    const run = video(["validate", notes]);
    assert.equal(run.status, 2);
    assert.match(
      run.stderr,
      /notes\.txt: not a project directory or a \.qmd file/,
    );
  });

  it("exits 2 with usage when no path is given", () => {
    const run = video(["validate"]);
    assert.equal(run.status, 2);
    assert.match(run.stderr, /^usage: video validate/);
  });

  it("exits 2 when quarto cannot be started", () => {
    const project = copyProject("minimal-filter", "no-quarto");
    const result = spawnSync(
      process.execPath,
      [LAUNCHER, "validate", project],
      {
        encoding: "utf8",
        env: { ...process.env, PATH: BIN_DIR },
      },
    );
    const run = finish(result);
    assert.equal(run.status, 2);
    assert.match(run.stderr, /cannot run quarto/);
  });

  it("exits 1 and reports the document when the filter rejects it", () => {
    const project = join(SCRATCH, "invalid-video-setting");
    mkdirSync(project, { recursive: true });
    writeFileSync(
      join(project, "index.qmd"),
      '---\nvideo:\n  fps: 0\n---\n\n::: {.scene component="title" duration="4s"}\nX\n:::\n',
    );
    const run = video(["validate", project]);
    assert.equal(run.status, 1);
    assert.equal(run.stdout, "");
    assert.equal(
      run.stderr,
      'ERROR index.qmd\nvideo.fps must be a whole number of at least 1, got "0"\n' +
        "Use a whole number of at least 1, for example 30.\n",
    );
  });

  // IR 1.4 allows a scene with no slots (ADR-0014), so this project, a title
  // with no content, is now a stage 2 contract error rather than a schema error.
  it("prints the contract error for a scene with no content and exits 1", () => {
    const project = copyProject("cli-validate-invalid-ir", "invalid-ir");
    const run = video(["validate", project]);
    assert.equal(run.status, 1);
    assert.equal(run.stdout, "");
    assert.equal(
      run.stderr,
      'ERROR index.qmd:10\nComponent "title" needs content in slot "default" or in slot "text-overlay".\n' +
        'Slot "default" accepts paragraph, heading.\n',
    );
  });

  it("prints no IR on stdout and exits 1 when the IR is invalid", () => {
    const project = copyProject("cli-validate-invalid-ir", "invalid-ir-print");
    const run = video(["validate", "--print-ir", project]);
    assert.equal(run.status, 1);
    assert.equal(run.stdout, "");
    assert.match(run.stderr, /^ERROR index\.qmd:10\n/);
  });
});
