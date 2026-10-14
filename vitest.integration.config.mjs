// Integration suite: real renders through the `video` pipeline (tests/README.md).
// Slow by design, so it is kept out of the unit run (vitest.config.mjs).
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 300_000,
    hookTimeout: 60_000,
  },
});
