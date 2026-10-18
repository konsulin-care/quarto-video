// `npm run test:visual` and `npm run test:visual:approve` (tests/README.md).
// Usage: tsx tests/visual/run.ts [--approve] [case ...]
// Exit 0 when every frame matches its reference, 1 when one differs or a run
// fails, 2 on a usage error. The report is tests/visual/report/index.html.
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runVisual } from "./harness.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const VISUAL = fileURLToPath(new URL(".", import.meta.url));

// The media clips are generated (gitignored), so a clean checkout has none.
// Generate them here, as the integration tests do, before any case validates.
function generateMedia(): void {
  execFileSync(
    "bash",
    [join(ROOT, "tests", "fixtures", "media", "generate.sh")],
    {
      stdio: "ignore",
    },
  );
}

async function main(argv: string[]): Promise<number> {
  const flags = argv.filter((arg) => arg.startsWith("--"));
  const only = argv.filter((arg) => !arg.startsWith("--"));
  const unknown = flags.filter((flag) => flag !== "--approve");
  if (unknown.length > 0) {
    console.error(`visual: unknown argument ${unknown[0]}`);
    return 2;
  }
  const mode = flags.includes("--approve") ? "approve" : "test";
  generateMedia();
  const scratchDir = await mkdtemp(join(tmpdir(), "visual-"));
  try {
    const run = await runVisual({
      root: ROOT,
      casesDir: join(VISUAL, "cases"),
      referencesDir: join(VISUAL, "references"),
      reportDir: join(VISUAL, "report"),
      scratchDir,
      mode,
      only,
    });
    if (mode === "approve") {
      for (const file of run.approved) console.log(`approved ${file}`);
      console.log(`visual: approved ${run.approved.length} reference(s)`);
      return 0;
    }
    for (const result of run.results) {
      console.log(
        `${result.status === "pass" ? "ok  " : "FAIL"} ${result.case} frame ${result.frame}: ${result.message}`,
      );
    }
    console.log(`report: ${run.reportFile ?? "none"}`);
    console.log(
      run.passed
        ? `visual: passed (${run.results.length} frame(s))`
        : "visual: failed; open the report to see the differences",
    );
    return run.passed ? 0 : 1;
  } catch (error) {
    console.error(
      `visual: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 1;
  } finally {
    await rm(scratchDir, { recursive: true, force: true });
  }
}

process.exitCode = await main(process.argv.slice(2));
