// Vitest runs every workspace's unit tests from the root (ADR-0001).
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/test/**/*.test.ts", "renderer/*/test/**/*.test.ts"],
  },
});
