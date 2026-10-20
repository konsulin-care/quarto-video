// `video doctor` warns when a probed version is outside the compatibility matrix
// (task 049; docs/guides/compatibility.md). A fake `quarto` on PATH reports 1.0.0,
// which the matrix does not list: the Quarto line carries the warning and the
// exit status is unchanged by it. Runs through the real bin (packages/cli/bin/video.mjs).
// Takes a few seconds; runs in the test:integration:render group.
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { strict as assert } from "node:assert";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN_DIR = join(ROOT, "node_modules", ".bin");
const SCRATCH = mkdtempSync(join(tmpdir(), "video-compat-"));
const FAKE_QUARTO = join(SCRATCH, "quarto");

interface ToolRow {
  tool: string;
  ok: boolean;
  version: string | null;
  hint: string | null;
  warning: string | null;
}

function doctor(path: string) {
  return spawnSync(join(BIN_DIR, "video"), ["doctor", "--json"], {
    cwd: ROOT,
    encoding: "utf8",
    env: {
      ...(process.env as Record<string, string>),
      PATH: `${SCRATCH}${delimiter}${BIN_DIR}${delimiter}${path}`,
    },
  });
}

before(() => {
  // Reports Quarto 1.0.0 and Pandoc 3.10 (the pinned one): only Quarto is outside the matrix.
  writeFileSync(
    FAKE_QUARTO,
    '#!/bin/sh\nif [ "$1" = "pandoc" ]; then echo "pandoc 3.10"; else echo "1.0.0"; fi\n',
  );
  chmodSync(FAKE_QUARTO, 0o755);
});

after(() => rmSync(SCRATCH, { recursive: true, force: true }));

describe("video doctor compatibility warning", () => {
  it("warns on the Quarto row when its version is outside the matrix", () => {
    const result = doctor(process.env["PATH"] ?? "");
    const rows = JSON.parse(result.stdout) as ToolRow[];
    const quarto = rows.find((row) => row.tool === "quarto");
    assert.equal(quarto?.ok, true, "a fake quarto that runs is ok");
    assert.equal(quarto?.version, "1.0.0");
    assert.match(
      quarto?.warning ?? "",
      /^1\.0\.0 is outside the compatibility matrix/,
    );
    assert.match(quarto?.warning ?? "", /docs\/guides\/compatibility\.md/);
    const pandoc = rows.find((row) => row.tool === "pandoc");
    assert.equal(pandoc?.warning, null, "pandoc 3.10 is listed");
  });

  it("prints the warning on the human line and keeps one line per tool", () => {
    const result = spawnSync(join(BIN_DIR, "video"), ["doctor"], {
      cwd: ROOT,
      encoding: "utf8",
      env: {
        ...(process.env as Record<string, string>),
        PATH: `${SCRATCH}${delimiter}${BIN_DIR}${delimiter}${process.env["PATH"] ?? ""}`,
      },
    });
    const line = result.stdout
      .split("\n")
      .find((text) => text.startsWith("✓ quarto"));
    assert.ok(line, result.stdout);
    assert.match(line, /⚠ 1\.0\.0 is outside the compatibility matrix/);
    assert.equal(result.stdout.trimEnd().split("\n").length, 6);
  });

  it("gives no warning for the pinned Quarto (the real PATH)", () => {
    const rows = JSON.parse(
      spawnSync(join(BIN_DIR, "video"), ["doctor", "--json"], {
        cwd: ROOT,
        encoding: "utf8",
        env: {
          ...(process.env as Record<string, string>),
          PATH: `${BIN_DIR}${delimiter}${process.env["PATH"] ?? ""}`,
        },
      }).stdout,
    ) as ToolRow[];
    const quarto = rows.find((row) => row.tool === "quarto");
    assert.equal(quarto?.version, "1.10.19");
    assert.equal(quarto?.warning, null);
  });
});
