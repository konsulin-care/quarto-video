// Renders the minimal IR example (shrunk to 640x360, 1 s) and probes the MP4
// with ffprobe. Needs an existing Chromium headless shell: set
// QV_BROWSER_EXECUTABLE, or let Playwright's cache (PLAYWRIGHT_BROWSERS_PATH)
// be searched. No browser found is a failure, never a silent skip.
import { execFile } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { render } from "../../renderer/remotion/src/render.js";

const run = promisify(execFile);
const EXAMPLE = fileURLToPath(
  new URL("../../packages/ir/examples/minimal.json", import.meta.url),
);
const TIMEOUT_MS = 300_000;

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

interface IrFixture {
  settings: { width: number; height: number; fps: number; background: string };
  scenes: { durationFrames: number; [key: string]: unknown }[];
  [key: string]: unknown;
}

interface Probe {
  width: number;
  height: number;
  rFrameRate: string;
  frames: number;
}

/** Reads the first video stream's size, rate and decoded frame count. */
async function probe(file: string): Promise<Probe> {
  const { stdout } = await run("ffprobe", [
    "-v",
    "error",
    "-count_frames",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height,r_frame_rate,nb_read_frames",
    "-of",
    "json",
    file,
  ]);
  const stream = (
    JSON.parse(stdout) as { streams: Record<string, string | number>[] }
  ).streams[0];
  if (!stream) throw new Error(`no video stream in ${file}`);
  return {
    width: Number(stream["width"]),
    height: Number(stream["height"]),
    rFrameRate: String(stream["r_frame_rate"]),
    frames: Number(stream["nb_read_frames"]),
  };
}

let dir: string;
let minimal: IrFixture;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "render-integration-"));
  minimal = JSON.parse(readFileSync(EXAMPLE, "utf8")) as IrFixture;
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("render integration", () => {
  it(
    "renders minimal.json at 640x360, 30 fps, 30 frames",
    async () => {
      const ir: IrFixture = structuredClone(minimal);
      ir.settings.width = 640;
      ir.settings.height = 360;
      ir.scenes[0]!.durationFrames = 30;
      const input = join(dir, "minimal-640x360.json");
      const output = join(dir, "minimal.mp4");
      await writeFile(input, JSON.stringify(ir));

      await render(input, output, { browserExecutable: browserExecutable() });

      const result = await probe(output);
      expect(result.width).toBe(640);
      expect(result.height).toBe(360);
      expect(result.rFrameRate).toBe("30/1");
      expect(result.frames).toBe(30);
    },
    TIMEOUT_MS,
  );

  it(
    "renders frames equal to the sum of scene durationFrames",
    async () => {
      const ir: IrFixture = structuredClone(minimal);
      ir.settings.width = 640;
      ir.settings.height = 360;
      const first = structuredClone(ir.scenes[0]!);
      first.durationFrames = 20;
      const second = {
        ...structuredClone(ir.scenes[0]!),
        id: "scene-002",
        durationFrames: 10,
      };
      ir.scenes = [first, second];
      const input = join(dir, "two-scenes.json");
      const output = join(dir, "two-scenes.mp4");
      await writeFile(input, JSON.stringify(ir));

      await render(input, output, { browserExecutable: browserExecutable() });

      expect((await probe(output)).frames).toBe(30);
    },
    TIMEOUT_MS,
  );
});
