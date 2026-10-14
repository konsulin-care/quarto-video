// Golden test: index.qmd -> Lua filter -> manifest.json (task 003).
// Runs the documented Pandoc invocation (_extensions/video/README.md) on the
// fixture, then checks the manifest against expected.json and validateIr.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { validateIr } from "@quarto-video/ir";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PROJECT = join(ROOT, "tests/fixtures/projects/minimal-filter");
const FILTER = join(ROOT, "_extensions/video/video.lua");
const BUILD_DIR = ".video-build";
// Words that belong to Pandoc, Remotion or React and must never reach the IR.
const FORBIDDEN =
  /\b(Pandoc|Para|Str|Div|Plain|Space|Meta\w*|React|Remotion|jsx|tsx)\b/;

/** Runs the filter on `<project>/index.qmd` through Quarto's Pandoc; throws on failure. */
function runFilter(project: string): void {
  execFileSync(
    "quarto",
    [
      "pandoc",
      join(project, "index.qmd"),
      "--from",
      "markdown",
      "--to",
      "native",
      "--lua-filter",
      FILTER,
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
}

function listProject(project: string): string[] {
  return readdirSync(project)
    .filter((name) => name !== BUILD_DIR)
    .sort();
}

describe("minimal filter golden test", () => {
  it("writes a manifest that deep-equals expected.json and passes validateIr", () => {
    rmSync(join(PROJECT, BUILD_DIR), { recursive: true, force: true });
    const before = listProject(PROJECT);
    runFilter(PROJECT);
    assert.deepEqual(
      listProject(PROJECT),
      before,
      "filter wrote nothing outside .video-build",
    );

    const text = readFileSync(
      join(PROJECT, BUILD_DIR, "manifest.json"),
      "utf8",
    );
    const manifest: unknown = JSON.parse(text);
    const expected: unknown = JSON.parse(
      readFileSync(join(PROJECT, "expected.json"), "utf8"),
    );
    assert.deepEqual(manifest, expected);
    assert.deepEqual(validateIr(manifest), { ok: true, errors: [] });
  });

  it("keeps Pandoc and React names out of the manifest", () => {
    runFilter(PROJECT);
    const text = readFileSync(
      join(PROJECT, BUILD_DIR, "manifest.json"),
      "utf8",
    );
    assert.equal(
      FORBIDDEN.test(text),
      false,
      "manifest contains a forbidden name",
    );
  });

  it("removes a stale manifest when the document is rejected", () => {
    const project = mkdtempSync(join(tmpdir(), "video-filter-"));
    try {
      // An invalid setting: the filter must fail and must not leave the old manifest.
      writeFileSync(
        join(project, "index.qmd"),
        "---\nvideo:\n  fps: 0\n---\n\n# Rejected\n",
      );
      mkdirSync(join(project, BUILD_DIR));
      writeFileSync(join(project, BUILD_DIR, "manifest.json"), "{}\n");
      assert.throws(
        () => runFilter(project),
        /video\.fps must be a whole number of at least 1/,
      );
      assert.equal(
        existsSync(join(project, BUILD_DIR, "manifest.json")),
        false,
      );
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});
