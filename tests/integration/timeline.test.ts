// Timeline and transitions through the real `video` bin (task 015; PRD §8.3,
// ADR-0005). Each timeline-* fixture yields its expected.json: a timeline for
// the valid projects, the codes, lines and scene ids for the invalid ones. The
// rendered MP4 of timeline-render has the frame count of the IR timeline.
// Fixtures are copied to a scratch dir, so .video-build never lands in
// tests/fixtures. Runs under tsx with node:test, like contract.test.ts.
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
import { homedir, tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";
import { strict as assert } from "node:assert";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN_DIR = join(ROOT, "node_modules", ".bin");
const FIXTURES = join(ROOT, "tests", "fixtures", "projects");
const SCRATCH = mkdtempSync(join(tmpdir(), "video-timeline-"));
const KEYS = ["code", "line", "sceneId"] as const;

interface Run {
  status: number | null;
  stdout: string;
  stderr: string;
}

interface Timeline {
  durationFrames: number;
  scenes: { id: string; startFrame: number }[];
}

/** Runs the installed `video` bin with the browser and PATH it needs. */
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

/** Copies a fixture's index.qmd to a scratch project and returns its root. */
function copyFixture(fixture: string, name = fixture): string {
  const root = join(SCRATCH, name);
  mkdirSync(root, { recursive: true });
  writeFileSync(
    join(root, "index.qmd"),
    readFileSync(join(FIXTURES, fixture, "index.qmd"), "utf8"),
  );
  return root;
}

function expectedOf(fixture: string): unknown {
  return JSON.parse(
    readFileSync(join(FIXTURES, fixture, "expected.json"), "utf8"),
  ) as unknown;
}

/** Finds the Playwright-installed headless shell without downloading anything. */
function browserExecutable(): string {
  const explicit = process.env["QV_BROWSER_EXECUTABLE"];
  if (explicit) return explicit;
  const root =
    process.env["PLAYWRIGHT_BROWSERS_PATH"] ??
    join(homedir(), ".cache", "ms-playwright");
  const dir = existsSync(root)
    ? readdirSync(root).find((name) =>
        name.startsWith("chromium_headless_shell-"),
      )
    : undefined;
  if (!dir) {
    throw new Error(
      `no headless shell under ${root}; set QV_BROWSER_EXECUTABLE`,
    );
  }
  return join(root, dir, "chrome-linux", "headless_shell");
}

/** The decoded frame count of the first video stream (ffprobe). */
function decodedFrames(file: string): number {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-count_frames",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=nb_read_frames",
      "-of",
      "json",
      file,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`ffprobe failed: ${result.stderr}`);
  const stream = (
    JSON.parse(result.stdout) as { streams: { nb_read_frames: string }[] }
  ).streams[0];
  if (!stream) throw new Error(`no video stream in ${file}`);
  return Number(stream.nb_read_frames);
}

after(() => rmSync(SCRATCH, { recursive: true, force: true }));

const FIXTURE_NAMES = readdirSync(FIXTURES).filter((name) =>
  name.startsWith("timeline-"),
);
const VALID = ["timeline-overlap", "timeline-mixed", "timeline-render"];

describe("timeline fixtures", () => {
  for (const fixture of VALID) {
    it(`${fixture}: prints the timeline of expected.json`, () => {
      const run = video(["validate", "--print-ir", copyFixture(fixture)]);
      assert.equal(run.status, 0, run.stderr);
      const ir = JSON.parse(run.stdout) as { timeline: Timeline };
      assert.deepEqual(ir.timeline, expectedOf(fixture));
    });
  }

  for (const fixture of FIXTURE_NAMES.filter((name) => !VALID.includes(name))) {
    it(`${fixture}: yields exactly the codes, lines and scene ids of expected.json`, () => {
      const expected = expectedOf(fixture) as Record<string, unknown>[];
      const run = video(["validate", "--json", copyFixture(fixture)]);
      assert.equal(run.status, 1, run.stderr);
      const actual = JSON.parse(run.stdout) as Record<string, unknown>[];
      assert.deepEqual(
        actual.map((d) => Object.fromEntries(KEYS.map((k) => [k, d[k]]))),
        expected,
      );
    });
  }
});

describe("timeline summary", () => {
  it("reports the timeline total, not the sum of scene lengths", () => {
    // Three 4 s scenes with two 1 s fades: 300 frames, where the sum is 360.
    const run = video(["validate", copyFixture("timeline-overlap")]);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stdout, "OK timeline-overlap (3 scenes, 300 frames)\n");
  });
});

describe("timeline render", () => {
  it("writes an MP4 whose frame count is the IR timeline's durationFrames", () => {
    const root = copyFixture("timeline-render");
    const run = video(["render", root], {
      QV_BROWSER_EXECUTABLE: browserExecutable(),
    });
    assert.equal(run.status, 0, run.stderr);
    const expected = (expectedOf("timeline-render") as Timeline).durationFrames;
    assert.equal(decodedFrames(join(root, "output.mp4")), expected);
  });
});

describe("transition presets (task 022)", () => {
  it("transitions: one boundary per preset, on the timeline of expected.json", () => {
    const run = video(["validate", "--print-ir", copyFixture("transitions")]);
    assert.equal(run.status, 0, run.stderr);
    const ir = JSON.parse(run.stdout) as { timeline: Timeline };
    assert.deepEqual(ir.timeline, expectedOf("transitions"));
  });

  it("transitions: the rendered MP4 has the IR timeline's frame count", () => {
    const root = copyFixture("transitions");
    const run = video(["render", root], {
      QV_BROWSER_EXECUTABLE: browserExecutable(),
    });
    assert.equal(run.status, 0, run.stderr);
    const expected = (expectedOf("transitions") as Timeline).durationFrames;
    assert.equal(decodedFrames(join(root, "output.mp4")), expected);
  });

  it("an unknown transition names every registered transition", () => {
    const run = video(["validate", "--json", copyFixture("timeline-unknown")]);
    assert.equal(run.status, 1, run.stderr);
    const [found] = JSON.parse(run.stdout) as { suggestion?: string }[];
    assert.equal(
      found?.suggestion,
      "Known transitions: cut, fade, slide, wipe, zoom.",
    );
  });
});
