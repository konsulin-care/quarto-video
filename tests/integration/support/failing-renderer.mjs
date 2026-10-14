// Test-only renderer for the QV_TEST_RENDERER seam (packages/cli/README.md).
// It records each call in QV_TEST_RENDER_LOG, leaves partial bytes at the
// temp path it was given, then fails with a known message.
import { appendFileSync, writeFileSync } from "node:fs";
import process from "node:process";

export async function render(irPath, outPath) {
  const log = process.env["QV_TEST_RENDER_LOG"];
  if (log) appendFileSync(log, `${irPath} -> ${outPath}\n`);
  writeFileSync(outPath, "partial bytes from the failing stub");
  throw new Error("stub renderer: forced failure");
}
