import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Runs the real `npm run ir:check -w packages/ir -- <file>` from the repo root.
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const example = fileURLToPath(
  new URL("../examples/minimal.json", import.meta.url),
);

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "ir-check-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function runCheck(file: string): { status: number | null; stdout: string } {
  const result = spawnSync(
    "npm",
    ["run", "--silent", "ir:check", "-w", "packages/ir", "--", file],
    { cwd: repoRoot, encoding: "utf8" },
  );
  return { status: result.status, stdout: result.stdout };
}

describe("ir:check", () => {
  it("prints OK and exits 0 for a valid manifest", () => {
    expect(runCheck(example)).toEqual({ status: 0, stdout: "OK\n" });
  });

  it("prints the JSON path of each error and exits 1", () => {
    const file = join(dir, "bad.json");
    const bad = JSON.parse(
      `{"schemaVersion":"0.1","type":"video","settings":{"width":1920,"height":1080,"fps":30,"background":"#10131C"},"scenes":[{"id":"scene-001","component":"title","durationFrames":1.5,"content":{"text":"Hi"},"source":{"file":"index.qmd"}}]}`,
    );
    writeFileSync(file, JSON.stringify(bad));
    const result = runCheck(file);
    expect(result.status).toBe(1);
    expect(result.stdout).toMatch(/^\/scenes\/0\/durationFrames: .+\n$/);
  });

  it("names E_IR_UNSUPPORTED_VERSION and the supported versions for schemaVersion 2.0, exit 1", () => {
    const file = join(dir, "v2.json");
    const json = JSON.parse(
      readFileSync(new URL("../examples/v1.json", import.meta.url), "utf8"),
    );
    writeFileSync(file, JSON.stringify({ ...json, schemaVersion: "2.0" }));
    expect(runCheck(file)).toEqual({
      status: 1,
      stdout:
        '/schemaVersion: E_IR_UNSUPPORTED_VERSION "2.0" is not a supported IR version; supported versions: 0.1, 0.2, 0.3, 1.0, 1.1\n',
    });
  });

  it("exits 1 when the file cannot be read", () => {
    const result = runCheck(join(dir, "missing.json"));
    expect(result.status).toBe(1);
  });
});
