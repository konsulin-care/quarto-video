// `npm run render -w renderer/remotion -- <ir.json> <out.mp4>`
// Set QV_BROWSER_EXECUTABLE to an existing Chromium headless-shell binary.
import { render } from "./render.js";

const [irPath, outPath] = process.argv.slice(2);
if (!irPath || !outPath) {
  console.error("usage: render <ir.json> <out.mp4>");
  process.exit(2);
}

try {
  await render(irPath, outPath, {
    browserExecutable: process.env["QV_BROWSER_EXECUTABLE"] ?? null,
  });
  console.log(`rendered ${outPath}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
