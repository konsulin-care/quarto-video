// Reproducibility of `videos/demo` (task 049; PRD §11.1). Two renders of the demo at
// 960x540 (as demo.test.ts does) must produce identical stills at sampled frames.
// Stills method: each sampled frame of the MP4 is decoded by ffmpeg and hashed with
// `-f framemd5` (MD5 of the decoded pixels, exact, not approximated). The same two
// renders also check build-info.json: it validates against packages/cli/schema/
// build-info.json, the IR and asset hashes match across renders, and it changes when
// any project asset changes (each asset is changed in turn in a scratch copy).
// Time: two renders at 960x540 plus the ffmpeg reads: about 4 minutes on the
// reference machine (4 cores; the setup hook allows 30 minutes).
// Runs under tsx with node:test, in the test:integration:render group.
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import type { IrVideo } from "../../packages/ir/src/index.js";
import {
  buildInfo,
  buildInfoErrors,
  type BuildInfo,
} from "../../packages/cli/src/build-info.js";
import { detectTools } from "../../packages/cli/src/tools.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN_DIR = join(ROOT, "node_modules", ".bin");
const PROJECT = join(ROOT, "videos", "demo");
const SCRATCH = mkdtempSync(join(tmpdir(), "video-repro-"));
const REDUCED = { width: 960, height: 540 };
const SETUP_TIMEOUT_MS = 1_800_000;
const FIRST = join(SCRATCH, "run-a");
const SECOND = join(SCRATCH, "run-b");

after(() => rmSync(SCRATCH, { recursive: true, force: true }));

interface Run {
  status: number | null;
  stdout: string;
  stderr: string;
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
  if (!dir)
    throw new Error(
      `no headless shell under ${root}; set QV_BROWSER_EXECUTABLE`,
    );
  return join(root, dir, "chrome-linux", "headless_shell");
}

/** The validated IR text the CLI prints for a project, and the parsed IR. */
function irOf(root: string): { text: string; ir: IrVideo } {
  const run = video(["validate", "--print-ir", root]);
  assert.equal(run.status, 0, run.stderr);
  return { text: run.stdout, ir: JSON.parse(run.stdout) as IrVideo };
}

/** A copy of the demo at the reduced size, in `root`. */
function reducedCopy(root: string): void {
  cpSync(PROJECT, root, { recursive: true, force: true });
  const source = readFileSync(join(root, "index.qmd"), "utf8");
  const reduced = source
    .replace("width: 1920", `width: ${REDUCED.width}`)
    .replace("height: 1080", `height: ${REDUCED.height}`);
  assert.notEqual(reduced, source, "front matter size not found");
  writeFileSync(join(root, "index.qmd"), reduced);
}

/** One render of `root`; the MP4 is root/output.mp4. */
function render(root: string): void {
  const run = video(["render", root], {
    QV_BROWSER_EXECUTABLE: browserExecutable(),
  });
  assert.equal(run.status, 0, run.stderr);
}

/** The build info a render wrote. */
function buildInfoOf(root: string): BuildInfo {
  return JSON.parse(
    readFileSync(join(root, ".video-build", "build-info.json"), "utf8"),
  ) as BuildInfo;
}

/** MD5 of each sampled frame's decoded pixels, in sample order (ffmpeg framemd5). */
function stillHashes(file: string, frames: number[]): string[] {
  const select = frames.map((frame) => `eq(n\\,${frame})`).join("+");
  const result = spawnSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      file,
      "-map",
      "0:v:0",
      "-vf",
      `select=${select}`,
      "-fps_mode",
      "passthrough",
      "-f",
      "framemd5",
      "-",
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${result.stderr}`);
  return result.stdout
    .split("\n")
    .filter((line) => line !== "" && !line.startsWith("#"))
    .map((line) => line.split(",").at(-1)?.trim() ?? "");
}

/** Frames sampled across the video: the first, quarter, half, three quarters and last. */
function sampledFrames(durationFrames: number): number[] {
  const last = durationFrames - 1;
  const points = [
    0,
    Math.floor(durationFrames / 4),
    Math.floor(durationFrames / 2),
    Math.floor((durationFrames * 3) / 4),
    last,
  ];
  return [...new Set(points)];
}

let stills: { first: string[]; second: string[]; frames: number[] };
let irText = "";
let ir: IrVideo;

describe("videos/demo reproducibility", () => {
  before(
    () => {
      reducedCopy(FIRST);
      reducedCopy(SECOND);
      const sized = irOf(FIRST);
      irText = sized.text;
      ir = sized.ir;
      render(FIRST);
      render(SECOND);
      const frames = sampledFrames(sized.ir.timeline.durationFrames);
      stills = {
        frames,
        first: stillHashes(join(FIRST, "output.mp4"), frames),
        second: stillHashes(join(SECOND, "output.mp4"), frames),
      };
    },
    { timeout: SETUP_TIMEOUT_MS },
  );

  it("two renders produce identical stills at every sampled frame", () => {
    assert.equal(
      stills.first.length,
      stills.frames.length,
      "first render: missing frames",
    );
    assert.equal(
      stills.second.length,
      stills.frames.length,
      "second render: missing frames",
    );
    assert.deepEqual(
      stills.second,
      stills.first,
      `frames ${stills.frames.join(", ")}`,
    );
  });

  it("writes a build-info.json that validates against its schema", () => {
    for (const root of [FIRST, SECOND]) {
      const info = JSON.parse(
        readFileSync(join(root, ".video-build", "build-info.json"), "utf8"),
      ) as unknown;
      assert.deepEqual(buildInfoErrors(info), [], root);
    }
  });

  it("records the same IR hash, asset hashes and tool versions in both renders", () => {
    const first = buildInfoOf(FIRST);
    const second = buildInfoOf(SECOND);
    assert.equal(first.irHash, second.irHash);
    assert.deepEqual(second.assets, first.assets);
    assert.deepEqual(second.tools, first.tools);
    assert.equal(first.irSchemaVersion, ir.schemaVersion);
    assert.deepEqual(first.flags, { json: false, theme: null });
    assert.ok(first.assets.some((asset) => asset.kind === "footage"));
    assert.ok(first.assets.some((asset) => asset.kind === "device-frame"));
  });

  it("changes build-info when any project asset changes", async () => {
    const before = buildInfoOf(FIRST);
    const tools = detectTools(process.env);
    const key = (asset: { kind: string; path: string }) =>
      `${asset.kind}:${asset.path}`;
    const projectAssets = before.assets.filter(
      (asset) => asset.kind !== "device-frame",
    );
    assert.ok(
      projectAssets.length >= 4,
      "the demo names several project assets",
    );
    for (const asset of projectAssets) {
      const file = join(FIRST, asset.path);
      const original = readFileSync(file);
      try {
        writeFileSync(file, Buffer.concat([original, Buffer.from([0])]));
        const changed = await buildInfo({
          root: FIRST,
          ir,
          irText,
          flags: before.flags,
          tools,
        });
        assert.deepEqual(buildInfoErrors(changed), [], asset.path);
        assert.equal(changed.irHash, before.irHash, "the IR did not change");
        const hashOf = (info: BuildInfo, id: string) =>
          info.assets.find((item) => key(item) === id)?.sha256;
        assert.notEqual(hashOf(changed, key(asset)), asset.sha256, asset.path);
        for (const other of before.assets.filter(
          (item) => key(item) !== key(asset),
        )) {
          assert.equal(
            hashOf(changed, key(other)),
            other.sha256,
            `${other.path} changed`,
          );
        }
      } finally {
        writeFileSync(file, original);
      }
    }
  });
});
