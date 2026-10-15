// Stage 2 contract checks through the real `video` bin (task 014; PRD §9.1,
// §9.2). Every contract-* fixture must yield exactly the codes, lines and
// scene ids of its expected.json. Fixtures are copied to a scratch dir, so the
// filter's .video-build never lands in tests/fixtures. Runs under tsx with
// node:test, like validate.test.ts.
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
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
const STUB = join(
  ROOT,
  "tests",
  "integration",
  "support",
  "failing-renderer.mjs",
);
const SCRATCH = mkdtempSync(join(tmpdir(), "video-contract-"));
const KEYS = ["code", "line", "sceneId"] as const;

interface Run {
  status: number | null;
  stdout: string;
  stderr: string;
}

interface Expected {
  code: string;
  line: number;
  sceneId: string;
}

/** Runs the installed `video` bin from the repository root. */
function video(args: string[], env: Record<string, string> = {}): Run {
  const result = spawnSync(join(BIN_DIR, "video"), args, {
    cwd: ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
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

/** Copies a document to a scratch project named `name`; returns its root. */
function scratchProject(name: string, text: string): string {
  const root = join(SCRATCH, name);
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, "index.qmd"), text);
  return root;
}

/** Copies a fixture's index.qmd to a scratch project and returns its root. */
function copyFixture(fixture: string): string {
  return scratchProject(
    fixture,
    readFileSync(join(FIXTURES, fixture, "index.qmd"), "utf8"),
  );
}

/** 1-based line of the first line of `text` that contains `needle`. */
function lineOf(text: string, needle: string): number {
  const index = text.split("\n").findIndex((line) => line.includes(needle));
  assert.ok(index >= 0, `"${needle}" is not in the document`);
  return index + 1;
}

after(() => rmSync(SCRATCH, { recursive: true, force: true }));

const CONTRACT_FIXTURES = readdirSync(FIXTURES).filter((name) =>
  name.startsWith("contract-"),
);

describe("contract fixtures", () => {
  for (const fixture of CONTRACT_FIXTURES) {
    it(`${fixture}: yields exactly the codes, lines and scene ids of expected.json`, () => {
      const expected = JSON.parse(
        readFileSync(join(FIXTURES, fixture, "expected.json"), "utf8"),
      ) as Expected[];
      const run = video(["validate", "--json", copyFixture(fixture)]);
      assert.equal(run.status, expected.length === 0 ? 0 : 1, run.stderr);
      const actual = JSON.parse(run.stdout) as Record<string, unknown>[];
      assert.deepEqual(
        actual.map((d) => Object.fromEntries(KEYS.map((k) => [k, d[k]]))),
        expected,
      );
    });
  }

  it("prints the OK line for a valid project and exits 0", () => {
    const run = video(["validate", copyFixture("contract-valid")]);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stdout, "OK contract-valid (2 scenes, 90 frames)\n");
  });
});

describe("contract diagnostics for authors", () => {
  it("prints the PRD §9.2 block for an unknown component, with its line", () => {
    const run = video(["validate", copyFixture("contract-unknown-component")]);
    assert.equal(run.status, 1);
    assert.equal(run.stdout, "");
    assert.ok(
      run.stderr.includes(
        'ERROR index.qmd:15\nUnknown component "hero-title".\nAvailable components: bullets, comparison, end-card, section-divider, statement, title.\n',
      ),
      run.stderr,
    );
  });

  it("validates the shipped videos/hello project with no diagnostics", () => {
    const text = readFileSync(
      join(ROOT, "videos", "hello", "index.qmd"),
      "utf8",
    );
    const run = video(["validate", "--json", scratchProject("hello", text)]);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stdout, "[]\n");
  });

  it('rejects component="hero-title" in a copy of videos/hello', () => {
    const text = readFileSync(
      join(ROOT, "videos", "hello", "index.qmd"),
      "utf8",
    );
    const line = lineOf(text, 'component="title"');
    const edited = text.replace('component="title"', 'component="hero-title"');
    const run = video(["validate", scratchProject("hello-hero", edited)]);
    assert.equal(run.status, 1);
    assert.ok(
      run.stderr.includes(
        `ERROR index.qmd:${line}\nUnknown component "hero-title".\nAvailable components: bullets, comparison, end-card, section-divider, statement, title.\n`,
      ),
      run.stderr,
    );
  });

  it("names the unknown attribute colour in a copy of videos/hello", () => {
    const text = readFileSync(
      join(ROOT, "videos", "hello", "index.qmd"),
      "utf8",
    );
    const edited = text.replace(
      'component="title" duration="2s"',
      'component="title" duration="2s" colour="red"',
    );
    const run = video([
      "validate",
      "--json",
      scratchProject("hello-colour", edited),
    ]);
    assert.equal(run.status, 1);
    const [error] = JSON.parse(run.stdout) as {
      code: string;
      property: string;
      message: string;
    }[];
    assert.equal(error?.code, "E_SCENE_SHAPE");
    assert.equal(error?.property, "colour");
    assert.match(error?.message ?? "", /unknown attribute "colour"/);
  });

  it("never starts the renderer when stage 2 fails", () => {
    const root = copyFixture("contract-multiple");
    const log = join(SCRATCH, "contract-multiple-renderer.log");
    const run = video(["render", root], {
      QV_TEST_RENDERER: STUB,
      QV_TEST_RENDER_LOG: log,
    });
    assert.equal(run.status, 1, run.stderr);
    assert.equal(existsSync(log), false, "the renderer must not be invoked");
    assert.match(run.stderr, /Unknown component "hero-title"/);
    assert.match(
      run.stderr,
      /Component "title" needs content in slot "default"/,
    );
  });
});
