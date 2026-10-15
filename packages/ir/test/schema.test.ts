import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SCHEMAS = [
  "ir-0.1.json",
  "ir-0.2.json",
  "ir-0.3.json",
  "ir-1.0.json",
  "ir-1.1.json",
  "ir-1.2.json",
  "ir-1.3.json",
  "ir-1.4.json",
];

describe.each(SCHEMAS)("schema/%s", (name) => {
  it("contains no renderer, React or CSS terms", () => {
    const schemaText = readFileSync(
      new URL(`../schema/${name}`, import.meta.url),
      "utf8",
    );
    expect(schemaText).not.toMatch(/remotion|react|css/i);
  });
});
