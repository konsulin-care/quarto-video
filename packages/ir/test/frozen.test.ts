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
  "ir-1.1.json":
    "e86e9b762f9d9ba0f115017633b9eec5ec18fccd5f1d3baef42106fd79ace634",
  "ir-1.2.json":
    "95494915240c8ebe4bf05d5b4a531ac9e38feae2b308cbe2fe029a1744205087",
  "ir-1.3.json":
    "86518c2ec757832cadb9b5ecbc089ee4160effcb43bed127f4daaa2338618dbb",
  "ir-1.4.json":
    "2420b9fd1ae8713c36d1e68e669c77a9729cb430fff72c364a1e417e4dc3a19c",
  "ir-1.5.json":
    "86755032b765ae75a1cd09f0524227383997aaa2780a5f277093ada95bd6f988",
  "ir-1.6.json":
    "21a1b011a93a0d697da4b31c38f54c85d31aa047f281d4af922ad6ee7f7da50e",
  "ir-1.7.json":
    "d43adae6b0862d51574e89e224d9b87bcde2a093a488d5ab76ef4fbc410beb3c",
  "ir-1.8.json":
    "0a1c46dbb01018ec35c809bd3497175f9c02c95f41f5d38bfcb552cb50c76290",
};

describe.each(Object.entries(FROZEN))("frozen schema/%s", (name, sha256) => {
  it("is byte-identical to its released contents", () => {
    const bytes = readFileSync(new URL(`../schema/${name}`, import.meta.url));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(sha256);
  });
});
