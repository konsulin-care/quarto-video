import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// ADR-0001: renderer dependencies are exact; they change only in a dedicated task.
const manifest = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const EXACT = /^\d+\.\d+\.\d+$/;

describe("renderer dependency pinning", () => {
  const entries = Object.entries({
    ...manifest.dependencies,
    ...manifest.devDependencies,
  });

  it("declares Remotion packages", () => {
    const names = entries.map(([name]) => name);
    expect(names).toEqual(
      expect.arrayContaining([
        "remotion",
        "@remotion/bundler",
        "@remotion/renderer",
      ]),
    );
  });

  it("pins every dependency to an exact version (no ^ or ~)", () => {
    const loose = entries.filter(([, range]) => !EXACT.test(range));
    expect(loose).toEqual([]);
  });
});
