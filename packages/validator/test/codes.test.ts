// Every emitted code is in DIAGNOSTIC_CODES and in the README table, and the
// table lists no code the tools do not emit (packages/validator/README.md).
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DIAGNOSTIC_CODES } from "../src/index.js";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const CODE = /\bE_[A-Z][A-Z0-9_]*\b/g;

/** Every file under `dir` whose name ends with one of `exts`. */
function sourceFiles(dir: string, exts: string[]): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path, exts);
    return exts.some((ext) => name.endsWith(ext)) ? [path] : [];
  });
}

/** Codes written anywhere in the emitting sources (Lua filter and package src/). */
function emittedCodes(): Set<string> {
  const packageSrc = readdirSync(join(ROOT, "packages")).flatMap((name) => {
    const src = join(ROOT, "packages", name, "src");
    return existsSync(src) ? sourceFiles(src, [".ts"]) : [];
  });
  const files = [
    ...sourceFiles(join(ROOT, "_extensions", "video"), [".lua"]).filter(
      (file) => !file.includes(`${sep}tests${sep}`),
    ),
    ...packageSrc,
  ];
  const found = new Set<string>();
  for (const file of files) {
    for (const match of readFileSync(file, "utf8").matchAll(CODE)) {
      found.add(match[0]);
    }
  }
  return found;
}

/** Codes listed in the first column of the README's code table. */
function documentedCodes(): Set<string> {
  const readme = readFileSync(
    join(ROOT, "packages", "validator", "README.md"),
    "utf8",
  );
  const rows = readme.split("\n").filter((line) => line.startsWith("| `E_"));
  return new Set(rows.map((row) => row.split("`")[1] ?? ""));
}

describe("diagnostic codes", () => {
  it("lists every emitted code in the README table", () => {
    const documented = documentedCodes();
    for (const code of emittedCodes()) {
      expect(documented.has(code), `${code} is not in the README table`).toBe(
        true,
      );
    }
  });

  it("documents no code that is not emitted", () => {
    const emitted = emittedCodes();
    for (const code of documentedCodes()) {
      expect(emitted.has(code), `${code} is not emitted`).toBe(true);
    }
  });

  it("matches DIAGNOSTIC_CODES exactly", () => {
    expect([...emittedCodes()].sort()).toEqual([...DIAGNOSTIC_CODES].sort());
  });
});
