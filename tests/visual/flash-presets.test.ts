// Every shipped preset passes the flash-rate check (PRD §12; task 023). The
// fixtures cover each animation and transition at normal motion and with
// reduced motion on; every frame of each project is rendered to a still and
// its full-frame luminance is checked (flash.ts). Runs under `tsx --test` in
// `npm run test:visual`.
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { listAnimations, listTransitionPresets } from "@quarto-video/registry";
import { renderStills } from "../../renderer/remotion/src/still.js";
import {
  MAX_FLASHES_PER_SECOND,
  fullFrameLuma,
  maxFlashesPerSecond,
} from "./flash.js";
import { findBrowser, projectIr } from "./harness.js";
import { readPng } from "./png.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PROJECTS = [
  "tests/fixtures/projects/animations-basic",
  "tests/fixtures/projects/animations-exit",
  "tests/fixtures/projects/transitions",
  "tests/fixtures/projects/reduced-motion-animations",
  "tests/fixtures/projects/reduced-motion-transitions",
  "tests/fixtures/projects/preset-kinetic",
  "tests/fixtures/projects/reduced-motion-kinetic",
  "tests/fixtures/projects/preset-stagger",
  "tests/fixtures/projects/reduced-motion-stagger",
  "tests/fixtures/projects/preset-count-up",
  "tests/fixtures/projects/reduced-motion-count-up",
];
const TIMEOUT_MS = 900_000;

const scratchRoots: string[] = [];
after(async () => {
  for (const dir of scratchRoots)
    await rm(dir, { recursive: true, force: true });
});

interface Measured {
  fps: number;
  maxPerSecond: number;
  presets: Set<string>;
}

/** Renders every frame of `project` and measures its flashes; also lists the presets it uses. */
async function measure(project: string): Promise<Measured> {
  const scratch = await mkdtemp(join(tmpdir(), "video-flash-"));
  scratchRoots.push(scratch);
  const irPath = await projectIr(ROOT, project, scratch);
  const ir = JSON.parse(readFileSync(irPath, "utf8")) as {
    settings: { fps: number };
    timeline: { durationFrames: number };
    scenes: Array<{
      animation?: { name: string };
      exit?: { name: string };
      transition?: { name: string };
    }>;
  };
  const frames = Array.from(
    { length: ir.timeline.durationFrames },
    (_, i) => i,
  );
  const stills = await renderStills(irPath, join(scratch, "stills"), {
    frames,
    browserExecutable: findBrowser(),
  });
  const lumas: number[] = [];
  for (const still of stills) lumas.push(fullFrameLuma(await readPng(still)));
  const presets = new Set<string>();
  for (const scene of ir.scenes) {
    if (scene.animation) presets.add(scene.animation.name);
    if (scene.exit) presets.add(scene.exit.name);
    if (scene.transition) presets.add(scene.transition.name);
  }
  return {
    fps: ir.settings.fps,
    maxPerSecond: maxFlashesPerSecond(lumas, ir.settings.fps),
    presets,
  };
}

describe("flash-rate check over the shipped presets", () => {
  const measured = new Map<string, Measured>();

  for (const project of PROJECTS) {
    it(
      `${project}: at most ${MAX_FLASHES_PER_SECOND} full-frame luminance flashes in any second`,
      { timeout: TIMEOUT_MS },
      async () => {
        const result = await measure(project);
        measured.set(project, result);
        assert.ok(
          result.maxPerSecond <= MAX_FLASHES_PER_SECOND,
          `${result.maxPerSecond} flashes in one second (limit ${MAX_FLASHES_PER_SECOND})`,
        );
      },
    );
  }

  it("the projects use every registered animation and transition", () => {
    const used = new Set<string>();
    for (const result of measured.values()) {
      for (const name of result.presets) used.add(name);
    }
    const registered = [
      ...listAnimations().map((preset) => preset.id),
      ...listTransitionPresets().map((preset) => preset.id),
    ];
    const missing = registered.filter((id) => !used.has(id));
    assert.deepEqual(missing, [], "presets with no flash check");
  });
});
