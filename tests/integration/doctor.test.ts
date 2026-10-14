// `video doctor` through the real bin (packages/cli/bin/video.mjs): the JSON
// lists every tool with its ok flag, version or hint, the exit status follows
// the flags, and the human report has one ✓/✗ line per tool (task 018; PRD §9.1).
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN_DIR = join(ROOT, "node_modules", ".bin");
const TOOLS = ["node", "quarto", "pandoc", "remotion", "browser", "ffprobe"];

interface ToolRow {
  tool: string;
  ok: boolean;
  version: string | null;
  hint: string | null;
}

/** Finds the Playwright-installed headless shell without downloading anything. */
function browserExecutable(): string {
  const explicit = process.env["QV_BROWSER_EXECUTABLE"];
  if (explicit) return explicit;
  const root =
    process.env["PLAYWRIGHT_BROWSERS_PATH"] ??
    join(homedir(), ".cache", "ms-playwright");
  const dir = existsSync(root)
    ? readdirSync(root).find((name) =>
        name.startsWith("chromium_headless_shell-"),
      )
    : undefined;
  if (!dir) return "";
  return join(root, dir, "chrome-linux", "headless_shell");
}

function doctor(args: string[], env: Record<string, string> = {}) {
  return spawnSync(join(BIN_DIR, "video"), ["doctor", ...args], {
    cwd: ROOT,
    encoding: "utf8",
    env: {
      ...(process.env as Record<string, string>),
      QV_BROWSER_EXECUTABLE: browserExecutable(),
      PATH: `${BIN_DIR}${delimiter}${process.env["PATH"] ?? ""}`,
      ...env,
    },
  });
}

describe("video doctor", () => {
  it("lists every tool in --json with its ok flag, and a version or a hint", () => {
    const result = doctor(["--json"]);
    const rows = JSON.parse(result.stdout) as ToolRow[];
    assert.deepEqual(
      rows.map((row) => row.tool),
      TOOLS,
    );
    for (const row of rows) {
      assert.equal(typeof row.ok, "boolean", row.tool);
      if (row.ok) {
        assert.equal(typeof row.version, "string", row.tool);
        assert.equal(row.hint, null, row.tool);
      } else {
        assert.equal(row.version, null, row.tool);
        assert.equal(typeof row.hint, "string", row.tool);
      }
    }
    const allOk = rows.every((row) => row.ok);
    assert.equal(result.status, allOk ? 0 : 2, result.stderr);
  });

  it("marks a tool missing through QV_TEST_MISSING with a hint and exits 2", () => {
    const result = doctor(["--json"], { QV_TEST_MISSING: "browser,ffprobe" });
    assert.equal(result.status, 2, result.stderr);
    const rows = JSON.parse(result.stdout) as ToolRow[];
    const byTool = new Map(rows.map((row) => [row.tool, row]));
    for (const tool of ["browser", "ffprobe"]) {
      const row = byTool.get(tool);
      assert.equal(row?.ok, false, tool);
      assert.match(
        row?.hint ?? "",
        /marked missing by QV_TEST_MISSING; install/,
      );
    }
  });

  it("prints one check or cross line per tool in the human report", () => {
    const result = doctor([], { QV_TEST_MISSING: "ffprobe" });
    const lines = result.stdout.trimEnd().split("\n");
    assert.equal(lines.length, TOOLS.length);
    lines.forEach((line, index) => {
      assert.match(line, new RegExp(`^[✓✗] ${TOOLS[index]}\\s`));
    });
    assert.match(lines.at(-1) ?? "", /^✗ ffprobe/);
    assert.equal(result.status, 2);
  });

  it("exits 2 with usage for an unknown argument", () => {
    const result = doctor(["--verbose"]);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /^usage: video validate/m);
  });
});
