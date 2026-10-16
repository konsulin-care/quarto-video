// Framed footage of the product-demo component (task 041; PRD §6.1 (2)): frame N
// of the browser scene shows source frame sourceStart + N. The counter is the one
// of tests/fixtures/media/generate.sh, read from each still at the footage's
// position in the frame. Needs a Chromium headless shell (QV_BROWSER_EXECUTABLE)
// and the generated clips.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { getFrame, getTheme } from "@quarto-video/registry";
import { safeAreaPixels, safeBox } from "@quarto-video/registry/layout";
import { renderStills } from "../../renderer/remotion/src/still.js";
import { captionBand } from "../../renderer/remotion/media/frames/caption.js";
import {
  fitFrame,
  screenBox,
  type Rect,
} from "../../renderer/remotion/media/frames/layout.js";
import { findBrowser, projectIr } from "../visual/harness.js";
import { readPng, type Rgb } from "../visual/png.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SCRATCH = mkdtempSync(join(tmpdir(), "video-product-frames-"));
// The browser scene's caption in component-product-demo (the same text).
const BROWSER_CAPTION =
  "Browser frame: 16:9 footage from 1 s to 3 s of the source.";
const WIDTH = 640;
const HEIGHT = 360;
const browser = findBrowser();

after(() => rmSync(SCRATCH, { recursive: true, force: true }));

/** The counter in one still: bit k is the k-th 40 px column of the top band (white = 1). */
function counterAt(
  image: Rgb,
  origin: { x: number; y: number },
  scale: number,
) {
  let value = 0;
  for (let bit = 0; bit < 8; bit++) {
    const x = Math.round(origin.x + (bit * 40 + 20) * scale);
    const y = Math.round(origin.y + 20 * scale);
    const i = (y * image.width + x) * 3;
    const luma =
      ((image.data[i] ?? 0) +
        (image.data[i + 1] ?? 0) +
        (image.data[i + 2] ?? 0)) /
      3;
    // The scrim leaves white near 137 and black near 10.
    if (luma > 70) value += 2 ** bit;
  }
  return value;
}

/**
 * Where the browser scene's footage sits in the canvas: the frame box above the
 * caption band, its screen, and the 640x360 counter clip drawn `contain` in it.
 */
function browserScreen(): { origin: { x: number; y: number }; scale: number } {
  const theme = getTheme("modern");
  const margin = safeAreaPixels(theme, WIDTH, HEIGHT);
  const safe = safeBox(theme, WIDTH, HEIGHT);
  const region: Rect = {
    left: margin.x,
    top: margin.y,
    width: safe.width,
    height: safe.height - captionBand(theme, BROWSER_CAPTION, safe.width),
  };
  const contract = getFrame("browser");
  const frame = fitFrame(region, contract.aspect);
  const screen = screenBox(contract, frame);
  const scale = Math.min(screen.width / 640, screen.height / 360);
  const drawnLeft = screen.left + (screen.width - 640 * scale) / 2;
  const drawnTop = screen.top + (screen.height - 360 * scale) / 2;
  return {
    origin: { x: frame.left + drawnLeft, y: frame.top + drawnTop },
    scale,
  };
}

before(() => {
  execFileSync(
    "bash",
    [join(ROOT, "tests", "fixtures", "media", "generate.sh")],
    { stdio: "ignore" },
  );
});

describe("product-demo framed clip frames", () => {
  it("frame N shows source frame sourceStart + N (the browser scene, 1 s in)", async () => {
    const scratch = mkdtempSync(join(SCRATCH, "still-"));
    const irPath = await projectIr(
      ROOT,
      "tests/fixtures/projects/component-product-demo",
      scratch,
    );
    const frames = [0, 1, 29, 59];
    const files = await renderStills(irPath, join(scratch, "stills"), {
      frames,
      browserExecutable: browser,
      assetRoot: join(scratch, "project"),
    });
    const screen = browserScreen();
    const counters: number[] = [];
    for (const file of files) {
      counters.push(
        counterAt(await readPng(file), screen.origin, screen.scale),
      );
    }
    assert.deepEqual(
      counters,
      frames.map((n) => 30 + n),
    );
  });
});
