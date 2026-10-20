// Integration suite: real renders through the `video` pipeline (tests/README.md).
// Slow by design, so it is kept out of the unit run (vitest.config.mjs).
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/integration/render*.test.ts"],
    // The render files share one Remotion bundle cache and run full Chromium
    // renders; run them one at a time (CI hung in render.test.ts when they overlapped).
    fileParallelism: false,
    testTimeout: 300_000,
    hookTimeout: 60_000,
  },
});
