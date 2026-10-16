// `video validate` on the background-video projects (task 039; PRD §6.1, §9.2).
// The four valid projects pass. A background block on a component that does not
// take it, and a framed block on a component that does not take framed (task 040:
// statement does), are E_MEDIA_PLACEMENT
// with the scene's line. Each run copies its project to scratch, so no fixture is written.
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN = join(ROOT, "packages", "cli", "bin", "video.mjs");
const SCRATCH = mkdtempSync(join(tmpdir(), "video-background-validate-"));

/** Validates a scratch copy of a fixture project and returns the run. */
function validate(project: string) {
  const copy = join(SCRATCH, project);
  cpSync(join(ROOT, "tests", "fixtures", "projects", project), copy, {
    recursive: true,
  });
  return spawnSync(process.execPath, [BIN, "validate", copy], {
    encoding: "utf8",
  });
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

describe("background footage validation", () => {
  for (const project of [
    "background-video",
    "background-video-loop",
    "background-video-freeze",
    "background-video-fit",
  ]) {
    it(`${project} validates`, () => {
      const run = validate(project);
      assert.equal(run.status, 0, run.stderr);
    });
  }

  it("rejects background footage on a component that does not take it, and framed footage", () => {
    const run = validate("background-video-unsupported");
    assert.equal(run.status, 1);
    assert.equal(
      run.stderr,
      [
        "ERROR index.qmd:8",
        'Component "section-divider" does not take "background" footage.',
        'Components that take "background" footage: statement, title.',
        "",
        "ERROR index.qmd:16",
        'Component "title" does not take "framed" footage.',
        'Components that take "framed" footage: product-demo, statement.',
        "",
      ].join("\n"),
    );
  });
});
