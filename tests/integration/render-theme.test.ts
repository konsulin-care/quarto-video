// Renders the `modern` theme with the browser pointed at an unreachable proxy:
// the title's fonts are bundled (renderer/remotion/themes/fonts), so the render
// needs nothing from the network (PRD §12, task 019). The manual check in the
// task's Completion log runs the same render inside a network namespace with no
// route out. Needs a Chromium headless shell (QV_BROWSER_EXECUTABLE).
import { execFile, spawnSync } from "node:child_process";
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
const UNREACHABLE = "http://127.0.0.1:9";

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

/** Reads the first video stream's size and decoded frame count. */
async function probe(
  file: string,
): Promise<{ width: number; height: number; frames: number }> {
  const { stdout } = await run("ffprobe", [
    "-v",
    "error",
    "-count_frames",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height,nb_read_frames",
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
    frames: Number(stream["nb_read_frames"]),
  };
}

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "render-theme-"));
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("render with the modern theme and no network", () => {
  it(
    "renders the title from bundled fonts with every proxy unreachable",
    async () => {
      const ir = JSON.parse(readFileSync(EXAMPLE, "utf8")) as {
        settings: { width: number; height: number };
        scenes: { durationFrames: number }[];
      };
      ir.settings.width = 640;
      ir.settings.height = 360;
      ir.scenes[0]!.durationFrames = 30;
      const input = join(dir, "modern-640x360.json");
      const output = join(dir, "modern.mp4");
      await writeFile(input, JSON.stringify(ir));

      const keys = ["http_proxy", "https_proxy", "HTTP_PROXY", "HTTPS_PROXY"];
      const saved = keys.map((key) => [key, process.env[key]] as const);
      for (const key of keys) process.env[key] = UNREACHABLE;
      try {
        await render(input, output, {
          browserExecutable: browserExecutable(),
          theme: "modern",
        });
      } finally {
        for (const [key, value] of saved) {
          if (value === undefined) delete process.env[key];
          else process.env[key] = value;
        }
      }

      const result = await probe(output);
      expect(result.width).toBe(640);
      expect(result.height).toBe(360);
      expect(result.frames).toBe(30);
    },
    TIMEOUT_MS,
  );
});

/** Writes the minimal example as a 640x360, 1 s IR with the given canvas colour. */
async function writeCanvasIr(
  name: string,
  background: string,
): Promise<string> {
  const ir = JSON.parse(readFileSync(EXAMPLE, "utf8")) as {
    settings: { width: number; height: number; background: string };
    scenes: { durationFrames: number }[];
  };
  ir.settings.width = 640;
  ir.settings.height = 360;
  ir.settings.background = background;
  ir.scenes[0]!.durationFrames = 30;
  const input = join(dir, `${name}.json`);
  await writeFile(input, JSON.stringify(ir));
  return input;
}

/** RGB of the top-left pixel of the first decoded frame. */
function cornerRgb(file: string): number[] {
  const result = spawnSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      file,
      "-frames:v",
      "1",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgb24",
      "-",
    ],
    { maxBuffer: 16 * 1024 * 1024 },
  );
  if (result.status !== 0)
    throw new Error(`ffmpeg failed: ${String(result.stderr)}`);
  return [...result.stdout.subarray(0, 3)];
}

/** H.264 may shift a flat colour by a few levels; this is well under a visible step. */
const COLOUR_TOLERANCE = 4;

function expectNear(actual: number[], expected: number[]): void {
  expected.forEach((value, channel) => {
    expect(Math.abs((actual[channel] ?? -1000) - value)).toBeLessThanOrEqual(
      COLOUR_TOLERANCE,
    );
  });
}

describe("canvas colour", () => {
  it(
    "draws the selected theme's background token when no video.background is set",
    async () => {
      // The IR carries the filter's default (#000000); the canvas must still be the token.
      const input = await writeCanvasIr("canvas-token", "#000000");
      const output = join(dir, "canvas-token.mp4");
      await render(input, output, {
        browserExecutable: browserExecutable(),
        theme: "modern",
      });
      expectNear(cornerRgb(output), [0x10, 0x13, 0x1c]);
    },
    TIMEOUT_MS,
  );

  it(
    "draws an explicit video.background over the theme's token",
    async () => {
      const input = await writeCanvasIr("canvas-explicit", "#000000");
      const output = join(dir, "canvas-explicit.mp4");
      await render(input, output, {
        browserExecutable: browserExecutable(),
        theme: "modern",
        background: "#2E7D32",
      });
      expectNear(cornerRgb(output), [0x2e, 0x7d, 0x32]);
    },
    TIMEOUT_MS,
  );
});
