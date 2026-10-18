// `video components` through the real bin (packages/cli/bin/video.mjs):
// table and JSON output, usage errors (tasks 013; PRD §5.5).
import { spawnSync } from "node:child_process";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN_DIR = join(ROOT, "node_modules", ".bin");

interface Run {
  status: number | null;
  stdout: string;
  stderr: string;
}

function video(args: string[]): Run {
  const result = spawnSync(join(BIN_DIR, "video"), args, {
    cwd: "/",
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${BIN_DIR}${delimiter}${process.env["PATH"] ?? ""}`,
    },
  });
  if (result.error !== undefined) throw result.error;
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

describe("video components", () => {
  it("prints a table with title, its slots and duration bounds", () => {
    const run = video(["components"]);
    assert.equal(run.status, 0, run.stderr);
    const lines = run.stdout.trimEnd().split("\n");
    assert.match(lines[0] ?? "", /^ID\s+VERSION\s+DURATION\s+SLOTS\s+PROPS$/);
    const title = lines.find((line) => line.startsWith("title "));
    assert.ok(title, `no title row in:\n${run.stdout}`);
    assert.match(title, /1s-30s/);
    assert.match(
      title,
      /default \(required: paragraph, heading\); subtitle \(optional: paragraph\)/,
    );
    assert.equal(run.stderr, "");
  });

  it("prints only a JSON array with --json, including slots, props and duration", () => {
    const run = video(["components", "--json"]);
    assert.equal(run.status, 0, run.stderr);
    const list = JSON.parse(run.stdout) as Array<Record<string, unknown>>;
    const title = list.find((c) => c["id"] === "title");
    assert.ok(title, "title is listed");
    assert.deepEqual(title["slots"], {
      default: {
        required: true,
        alternative: "text-overlay",
        accepts: ["paragraph", "heading"],
      },
      "text-overlay": {
        required: false,
        accepts: ["paragraph", "heading"],
        maxBlocks: 1,
      },
      subtitle: { required: false, accepts: ["paragraph"] },
    });
    assert.deepEqual(title["placements"], ["background"]);
    assert.deepEqual(title["props"], {});
    assert.deepEqual(title["duration"], { minMs: 1000, maxMs: 30000 });
  });

  it("rejects an extra argument with usage, exit 2", () => {
    const run = video(["components", "title"]);
    assert.equal(run.status, 2);
    assert.equal(run.stdout, "");
    assert.match(run.stderr, /usage: video validate/);
    assert.match(run.stderr, /video components \[--json\]/);
  });

  it("rejects an unknown flag, exit 2", () => {
    const run = video(["components", "--table"]);
    assert.equal(run.status, 2);
    assert.equal(run.stdout, "");
  });
});
