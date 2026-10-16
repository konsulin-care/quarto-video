// The visual regression run (PRD §13.3, task 020). For each case: the fixture
// project is copied to a scratch dir and validated through the real `video`
// bin (so the IR is the one authors get), the chosen frames are rendered to
// stills by renderStills(), and each still is compared with its approved
// reference. `approve` replaces the references instead of comparing.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { chmod, copyFile, cp, mkdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import type { ThemeTokens } from "@quarto-video/registry";
import { renderStills } from "../../renderer/remotion/src/still.js";
import { compareImages } from "./compare.js";
import { loadCases, type VisualCase } from "./cases.js";
import { writePng, pngSize, readPng } from "./png.js";
import { writeReport, type FrameResult } from "./report.js";

export interface VisualOptions {
  /** Repository root: fixture paths and the CLI bin resolve from here. */
  root: string;
  casesDir: string;
  referencesDir: string;
  /** Replaced on every compare run; never committed (tests/README.md). */
  reportDir: string;
  /** Scratch space for project copies, IR and stills; the caller removes it. */
  scratchDir: string;
  mode: "test" | "approve";
  /** Case names to run; empty runs every case. */
  only?: string[];
  /** Chromium headless shell; unset looks in the environment and Playwright cache. */
  browserExecutable?: string;
  /** Test seam (self-test): tokens to draw instead of the registry's. */
  tokens?: ThemeTokens;
}

export interface VisualRun {
  passed: boolean;
  results: FrameResult[];
  /** Approve mode: the reference files written. */
  approved: string[];
  /** Compare mode: the report's index.html. */
  reportFile?: string;
}

/** Finds a Chromium headless shell without downloading one (renderer/remotion/README.md). */
export function findBrowser(): string {
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

/**
 * A launcher that starts the headless shell with --disable-lcd-text, so every
 * still is drawn with greyscale antialiasing. Without it, a host's compositor
 * may draw the glyph edges of transformed or faded layers with subpixel (LCD)
 * colour fringes: CI (ubuntu-24.04) did, and the approved references do not.
 * Greyscale text is the same on every host, so the references stay valid.
 */
async function greyscaleBrowser(binary: string, dir: string): Promise<string> {
  await mkdir(dir, { recursive: true });
  const launcher = join(dir, "headless-shell-greyscale");
  const quoted = `'${binary.replace(/'/g, `'\\''`)}'`;
  await writeFile(
    launcher,
    `#!/bin/sh\nexec ${quoted} --disable-lcd-text "$@"\n`,
  );
  await chmod(launcher, 0o755);
  return launcher;
}

/** Copies the fixture project into scratch and returns the IR file from `video validate --print-ir`. */
export async function projectIr(
  root: string,
  project: string,
  scratch: string,
): Promise<string> {
  const copy = join(scratch, "project");
  await cp(resolve(root, project), copy, { recursive: true });
  const bin = join(root, "packages", "cli", "bin", "video.mjs");
  const run = spawnSync(
    process.execPath,
    [bin, "validate", copy, "--print-ir"],
    {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  if (run.status !== 0) {
    throw new Error(
      `validate ${project} exited ${run.status}: ${run.stderr.trim()}`,
    );
  }
  const irPath = join(scratch, "manifest.json");
  await writeFile(irPath, run.stdout);
  return irPath;
}

function percent(ratio: number): string {
  return `${(ratio * 100).toFixed(3)}%`;
}

/** Compares one rendered still with its reference and copies the images into the report. */
async function compareFrame(
  testCase: VisualCase,
  frame: number,
  actualPath: string,
  referencePath: string,
  reportDir: string,
): Promise<FrameResult> {
  const caseDir = join(reportDir, testCase.name);
  await mkdir(caseDir, { recursive: true });
  const base = `${testCase.name}/${frame}`;
  const images: FrameResult["images"] = {};
  await copyFile(actualPath, join(reportDir, `${base}-actual.png`));
  images.actual = `${base}-actual.png`;
  const fail = (message: string): FrameResult => ({
    case: testCase.name,
    frame,
    status: "fail",
    message,
    images,
  });
  if (!existsSync(referencePath)) {
    return fail(
      "No approved reference for this frame. Review the actual render; if it is right, run npm run test:visual:approve.",
    );
  }
  await copyFile(referencePath, join(reportDir, `${base}-reference.png`));
  images.reference = `${base}-reference.png`;
  const expected = await pngSize(referencePath);
  const actual = await pngSize(actualPath);
  if (expected.width !== actual.width || expected.height !== actual.height) {
    return fail(
      `Size ${actual.width}x${actual.height} differs from the reference ${expected.width}x${expected.height}.`,
    );
  }
  const comparison = compareImages(
    await readPng(referencePath),
    await readPng(actualPath),
    testCase.threshold,
  );
  await writePng(join(reportDir, `${base}-diff.png`), comparison.diff);
  images.diff = `${base}-diff.png`;
  const { channelTolerance, maxDiffRatio } = testCase.threshold;
  return {
    case: testCase.name,
    frame,
    status: comparison.passed ? "pass" : "fail",
    message:
      `${percent(comparison.ratio)} of pixels differ (${comparison.differing} of ${comparison.pixels}); ` +
      `largest channel change ${comparison.maxDelta}. Limit: ${percent(maxDiffRatio)} beyond ${channelTolerance} levels.`,
    images,
  };
}

/** Runs every selected case: render, then compare (test) or store (approve). */
export async function runVisual(options: VisualOptions): Promise<VisualRun> {
  const cases = await loadCases(options.casesDir, options.only);
  if (cases.length === 0) throw new Error("no visual cases to run");
  const browserExecutable = await greyscaleBrowser(
    options.browserExecutable ?? findBrowser(),
    options.scratchDir,
  );
  const run: VisualRun = { passed: true, results: [], approved: [] };
  if (options.mode === "test") {
    await rm(options.reportDir, { recursive: true, force: true });
    await mkdir(options.reportDir, { recursive: true });
  }
  for (const testCase of cases) {
    const caseScratch = join(options.scratchDir, testCase.name);
    await mkdir(caseScratch, { recursive: true });
    const irPath = await projectIr(options.root, testCase.project, caseScratch);
    const stills = await renderStills(irPath, join(caseScratch, "stills"), {
      theme: testCase.theme,
      frames: testCase.frames,
      browserExecutable,
      assetRoot: join(caseScratch, "project"),
      ...(options.tokens === undefined ? {} : { tokens: options.tokens }),
    });
    for (const [index, frame] of testCase.frames.entries()) {
      const actualPath = stills[index] ?? "";
      const referencePath = join(
        options.referencesDir,
        testCase.name,
        `${frame}.png`,
      );
      if (options.mode === "approve") {
        await mkdir(dirname(referencePath), { recursive: true });
        await copyFile(actualPath, referencePath);
        run.approved.push(relative(options.root, referencePath));
        continue;
      }
      const result = await compareFrame(
        testCase,
        frame,
        actualPath,
        referencePath,
        options.reportDir,
      );
      run.results.push(result);
      if (result.status === "fail") run.passed = false;
    }
  }
  if (options.mode === "test") {
    run.reportFile = await writeReport(options.reportDir, run.results);
  }
  return run;
}
