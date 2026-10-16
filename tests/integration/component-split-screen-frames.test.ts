// split-screen regions play their own footage (task 043; PRD §6.1). In
// component-split-screen, scene 1 shows two clips of one counter file side by
// side: the left from 1 s of the source, the right from 0 s. Each region's frame
// counter is read from the still at its column (regionColumns, the layout the
// renderer draws) and the fit (contain). Needs a Chromium headless shell
// (QV_BROWSER_EXECUTABLE) and the generated clips.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { getTheme } from "../../packages/registry/src/index.js";
import {
  regionColumns,
  type Rect,
} from "../../packages/registry/src/layout.js";
import { renderStills } from "../../renderer/remotion/src/still.js";
import { findBrowser, projectIr } from "../visual/harness.js";
import { readPng, type Rgb } from "../visual/png.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SCRATCH = mkdtempSync(join(tmpdir(), "video-split-screen-frames-"));
const browser = findBrowser();
const CANVAS = { width: 640, height: 360 };

/** Pixel of the frame counter's bit `bit` in a `contain` region: the 640x360 source scaled to fit the column. */
function bitPixel(column: Rect, bit: number): { x: number; y: number } {
  const scale = Math.min(
    column.width / CANVAS.width,
    column.height / CANVAS.height,
  );
  const offsetX = column.left + (column.width - CANVAS.width * scale) / 2;
  const offsetY = column.top + (column.height - CANVAS.height * scale) / 2;
  return {
    x: Math.round(offsetX + (bit * 40 + 20) * scale),
    y: Math.round(offsetY + 20 * scale),
  };
}

/** The frame counter of one region: bit k is the k-th 40 px column of the top band (white = 1). */
function counterIn(image: Rgb, column: Rect): number {
  let value = 0;
  for (let bit = 0; bit < 8; bit++) {
    const { x, y } = bitPixel(column, bit);
    const i = (y * image.width + x) * 3;
    const luma =
      ((image.data[i] ?? 0) +
        (image.data[i + 1] ?? 0) +
        (image.data[i + 2] ?? 0)) /
      3;
    if (luma > 70) value += 2 ** bit;
  }
  return value;
}

/** Renders frames of component-split-screen and returns each region's counter per frame. */
async function countersOf(frames: number[]) {
  const scratch = mkdtempSync(join(SCRATCH, "still-"));
  const irPath = await projectIr(
    ROOT,
    "tests/fixtures/projects/component-split-screen",
    scratch,
  );
  const files = await renderStills(irPath, join(scratch, "stills"), {
    frames,
    browserExecutable: browser,
    assetRoot: join(scratch, "project"),
  });
  const [left, right] = regionColumns(
    getTheme("modern"),
    CANVAS.width,
    CANVAS.height,
    2,
  );
  const result = { left: [] as number[], right: [] as number[] };
  for (const file of files) {
    const image = await readPng(file);
    result.left.push(counterIn(image, left!));
    result.right.push(counterIn(image, right!));
  }
  return result;
}

before(() => {
  execFileSync(
    "bash",
    [join(ROOT, "tests", "fixtures", "media", "generate.sh")],
    {
      stdio: "ignore",
    },
  );
});

after(() => {
  rmSync(SCRATCH, { recursive: true, force: true });
});

describe("split-screen regions play their own source ranges", () => {
  it("the left clip starts at 1 s of its source, the right clip at 0 s", async () => {
    const frames = [10, 40];
    const { left, right } = await countersOf(frames);
    // Source frames at 30 fps: left = 30 + n, right = n.
    assert.deepEqual(
      left,
      frames.map((n) => 30 + n),
    );
    assert.deepEqual(right, frames);
  });
});
