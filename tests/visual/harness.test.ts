// Self-test of the visual harness (task 020, tests/README.md): a perturbed theme
// token must make the run fail and write diff images with the changed pixels
// in red. Also the case-file error paths. Runs under `tsx --test` in
// `npm run test:visual`; the perturbation is in memory, never in the registry.
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import type { ThemeTokens } from "@quarto-video/registry";
import modern from "../../packages/registry/themes/modern.json" with { type: "json" };
import { parseCase } from "./cases.js";
import { runVisual } from "./harness.js";
import { readPng } from "./png.js";

const VISUAL = fileURLToPath(new URL(".", import.meta.url));
const ROOT = fileURLToPath(new URL("../..", import.meta.url));

const scratchRoots: string[] = [];
after(async () => {
  for (const dir of scratchRoots)
    await rm(dir, { recursive: true, force: true });
});

describe("case files", () => {
  const valid = {
    project: "tests/fixtures/projects/title-basic",
    theme: "modern",
    frames: [0, 29],
    threshold: { channelTolerance: 2, maxDiffRatio: 0.0005 },
  };

  it("accepts a well-formed case", () => {
    assert.equal(parseCase("title-basic", valid).name, "title-basic");
  });

  it("rejects an unknown key, naming it and the file", () => {
    assert.throws(
      () => parseCase("typo", { ...valid, frame: [0] }),
      /cases\/typo\.json: unknown key "frame"/,
    );
  });

  it("rejects an empty frame list", () => {
    assert.throws(() => parseCase("x", { ...valid, frames: [] }), /"frames"/);
  });

  it("rejects a diff ratio above 1", () => {
    assert.throws(
      () =>
        parseCase("x", {
          ...valid,
          threshold: { channelTolerance: 2, maxDiffRatio: 2 },
        }),
      /maxDiffRatio/,
    );
  });
});

describe("a perturbed theme token", () => {
  it("fails the run and writes diff images with the changed pixels in red", async () => {
    const scratch = await mkdtemp(join(tmpdir(), "visual-selftest-"));
    scratchRoots.push(scratch);
    const reportDir = join(scratch, "report");
    // Text colour moved far from #F5F7FA: the title's glyphs must differ.
    const tokens = {
      ...(modern as ThemeTokens),
      colors: { ...modern.colors, text: "#FF2D2D" },
    } as ThemeTokens;

    const run = await runVisual({
      root: ROOT,
      casesDir: join(VISUAL, "cases"),
      referencesDir: join(VISUAL, "references"),
      reportDir,
      scratchDir: join(scratch, "work"),
      mode: "test",
      only: ["title-basic"],
      tokens,
    });

    assert.equal(run.passed, false);
    const failed = run.results.filter((r) => r.status === "fail");
    assert.equal(failed.length, run.results.length, "every frame must differ");
    for (const result of failed) {
      const diff = join(reportDir, result.images.diff ?? "missing");
      assert.ok(existsSync(diff), `diff image written: ${diff}`);
      const image = await readPng(diff);
      let red = 0;
      for (let i = 0; i < image.data.length; i += 3) {
        if (image.data[i] === 255 && image.data[i + 1] === 0) red++;
      }
      assert.ok(red > 0, "diff image highlights the changed pixels in red");
    }
    assert.ok(run.reportFile);
    const html = readFileSync(run.reportFile, "utf8");
    assert.match(html, /FAIL/);
    assert.match(html, /title-basic · frame 29/);
  });
});
