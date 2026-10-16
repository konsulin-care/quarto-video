// `video validate` on the device-frame projects (task 040; PRD §5.5, §6.1, §9.2).
// The valid projects pass. A framed block that names no registered frame is
// E_MEDIA_FRAME with the scene's line and the registered frames listed. Each run
// validates a scratch copy, so no fixture is written by the test.
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN = join(ROOT, "packages", "cli", "bin", "video.mjs");
const SCRATCH = mkdtempSync(join(tmpdir(), "video-device-frames-"));

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
    { stdio: "ignore" },
  );
});

after(() => {
  rmSync(SCRATCH, { recursive: true, force: true });
});

describe("device frame validation", () => {
  for (const project of ["device-frames", "device-frames-media"]) {
    it(`${project} validates`, () => {
      const run = validate(project);
      assert.equal(run.status, 0, run.stderr);
    });
  }

  it("rejects a frame that is not registered, listing the registered frames", () => {
    const run = validate("device-frames-unknown");
    assert.equal(run.status, 1);
    assert.equal(
      run.stderr,
      [
        "ERROR index.qmd:8",
        'Unknown frame "laptop" on a framed video block.',
        "Registered frames: browser, generic, phone, tablet.",
        "",
      ].join("\n"),
    );
  });
});
