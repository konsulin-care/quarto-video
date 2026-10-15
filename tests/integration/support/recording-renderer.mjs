// Test-only renderer for the QV_TEST_RENDERER seam (packages/cli/README.md).
// It appends the theme and background it was called with to QV_TEST_RENDER_LOG
// (one JSON line per call), then writes the same MP4 as short-renderer.mjs.
import { appendFileSync } from "node:fs";
import process from "node:process";
import { render as writeShortVideo } from "./short-renderer.mjs";

export async function render(irPath, outPath, options = {}) {
  const log = process.env["QV_TEST_RENDER_LOG"];
  if (log) {
    const call = {
      theme: options.theme ?? null,
      background: options.background ?? null,
    };
    appendFileSync(log, `${JSON.stringify(call)}\n`);
  }
  await writeShortVideo(irPath, outPath, options);
}
