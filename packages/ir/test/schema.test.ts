import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schemaText = readFileSync(
  new URL("../schema/ir-0.1.json", import.meta.url),
  "utf8",
);

describe("schema/ir-0.1.json", () => {
  it("contains no renderer, React or CSS terms", () => {
    expect(schemaText).not.toMatch(/remotion|react|css/i);
  });
});
