// Released IR schema files never change in place (ADR-0007). A new version is
// a new file. A failure here means a frozen file was edited: revert it, or add
// a new schema file with its own ADR. The hashes are the released contents.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const FROZEN: Readonly<Record<string, string>> = {
  "ir-0.1.json":
    "ffb6004fc697d5f5c2e33e311b931fbda2a348d081fb4026beaf4269218d864e",
  "ir-0.2.json":
    "69b617d3663ff137d7419de6c785da53343eb9172c681b4b5e31a76ea94666db",
  "ir-0.3.json":
    "52ca672c971835e9cb307bd10307b4457795de6af963e2c117a750d6af22855e",
  "ir-1.0.json":
    "b30293915f1cf238007f931bf5ba5ff2f91cc4e2f747dea48af015d0f20dd3f5",
};

describe.each(Object.entries(FROZEN))("frozen schema/%s", (name, sha256) => {
  it("is byte-identical to its released contents", () => {
    const bytes = readFileSync(new URL(`../schema/${name}`, import.meta.url));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(sha256);
  });
});
