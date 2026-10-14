// The Quarto-native spike prints exactly the evidence recorded in ADR-0002
// (task 007; PRD §18.1). Runs the real script, which renders videos/hello in
// temp copies with the pinned Quarto (about a minute). Needs quarto, ffprobe,
// a Chromium headless shell and `npm ci`; a missing tool is a failure.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SCRIPT = join(ROOT, "scripts", "spike-quarto-native.sh");
const ADR = join(ROOT, "docs", "decisions", "0002-quarto-native-invocation.md");
const TIMEOUT_MS = 600_000;

/** The fenced block under "## Evidence" in ADR-0002. */
function adrEvidence(): string {
  const section = readFileSync(ADR, "utf8").split("## Evidence")[1] ?? "";
  const block = /```\n([\s\S]*?)```/.exec(section);
  assert.ok(block, "ADR-0002 has no evidence block");
  return block[1] ?? "";
}

describe("quarto-native spike", () => {
  it("prints the evidence recorded in ADR-0002", () => {
    const run = spawnSync(SCRIPT, {
      cwd: ROOT,
      encoding: "utf8",
      timeout: TIMEOUT_MS,
    });
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stdout, adrEvidence());
  });
});
