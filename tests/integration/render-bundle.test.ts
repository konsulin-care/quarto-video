// The Remotion bundle is removed after every render, on success and on
// failure (renderer/remotion/src/render.ts, withBundle). Each test points
// TMPDIR at a unique root, so a bundle left in the OS temp directory is seen
// here and no other process's files can be mistaken for ours. The success
// test needs a Chromium headless shell (QV_BROWSER_EXECUTABLE, or Playwright's
// cache); the failure test passes a missing browser path, so it renders
// nothing and needs no shell.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { render } from "../../renderer/remotion/src/render.js";

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

/** Bundle directories left in `dir`: ours (remotion-bundle-) and Remotion's old name. */
async function bundleLeftovers(dir: string): Promise<string[]> {
  return (await readdir(dir)).filter(
    (name) =>
      name.startsWith("remotion-bundle-") ||
      name.startsWith("remotion-webpack-bundle-"),
  );
}

let root: string;
let savedTmpdir: string | undefined;
let minimal: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "render-bundle-"));
  savedTmpdir = process.env["TMPDIR"];
  process.env["TMPDIR"] = join(root, "tmp");
  await mkdir(join(root, "tmp"), { recursive: true });
  minimal = readFileSync(EXAMPLE, "utf8");
});

afterAll(async () => {
  if (savedTmpdir === undefined) delete process.env["TMPDIR"];
  else process.env["TMPDIR"] = savedTmpdir;
  await rm(root, { recursive: true, force: true });
});

describe("render bundle cleanup", () => {
  it(
    "removes the bundle after a successful render",
    async () => {
      const ir = JSON.parse(minimal) as {
        settings: { width: number; height: number };
        scenes: { durationFrames: number }[];
      };
      ir.settings.width = 640;
      ir.settings.height = 360;
      ir.scenes[0]!.durationFrames = 15;
      const input = join(root, "minimal.json");
      const output = join(root, "out", "minimal.mp4");
      const workDir = join(root, "build");
      await writeFile(input, JSON.stringify(ir));

      await render(input, output, {
        browserExecutable: browserExecutable(),
        workDir,
      });

      expect(existsSync(output)).toBe(true);
      expect(await bundleLeftovers(workDir)).toEqual([]);
      expect(await bundleLeftovers(join(root, "tmp"))).toEqual([]);
    },
    TIMEOUT_MS,
  );

  it(
    "removes the bundle when the render fails after bundling",
    async () => {
      const input = join(root, "failing.json");
      await writeFile(input, minimal);
      const workDir = join(root, "failing-build");
      // The output's parent is a file, so the render throws after the bundle
      // is built and the browser has started.
      const blocker = join(root, "blocker");
      await writeFile(blocker, "not a directory");

      await expect(
        render(input, join(blocker, "out.mp4"), {
          browserExecutable: browserExecutable(),
          workDir,
        }),
      ).rejects.toThrow();

      expect(await bundleLeftovers(workDir)).toEqual([]);
      expect(await bundleLeftovers(join(root, "tmp"))).toEqual([]);
    },
    TIMEOUT_MS,
  );
});
