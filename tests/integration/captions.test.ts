// The project caption track (task 046; ADR-0019) through the real `video` CLI.
// captions-burn: a valid track whose one cue is on frames 15 to 44. captions-invalid:
// a malformed timestamp and a cue past the end, each citing its VTT line (expected.json).
// The sidecar test renders a copy of captions-burn in each mode: sidecar and both
// write output.vtt beside output.mp4, burn writes none. Needs a Chromium headless
// shell (QV_BROWSER_EXECUTABLE) and the Quarto pinned in mise.toml (the filter).
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { findBrowser } from "../visual/harness.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN_DIR = join(ROOT, "node_modules", ".bin");
const FIXTURES = join(ROOT, "tests", "fixtures", "projects");
const SCRATCH = mkdtempSync(join(tmpdir(), "video-captions-"));
const browser = findBrowser();

after(() => rmSync(SCRATCH, { recursive: true, force: true }));

interface Run {
  status: number | null;
  stdout: string;
  stderr: string;
}

/** Runs the installed `video` bin from the repository root. */
function video(args: string[], env: Record<string, string> = {}): Run {
  const result = spawnSync(join(BIN_DIR, "video"), args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    env: {
      ...process.env,
      ...env,
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

/** A copy of a fixture project in the scratch directory, with its mode rewritten. */
function copyProject(fixture: string, mode?: string): string {
  const dir = join(mkdtempSync(join(SCRATCH, "run-")), fixture);
  cpSync(join(FIXTURES, fixture), dir, { recursive: true });
  if (mode !== undefined) {
    const document = join(dir, "index.qmd");
    const text = readFileSync(document, "utf8").replace(
      /mode: burn/,
      `mode: ${mode}`,
    );
    writeFileSync(document, text);
  }
  return dir;
}

describe("captions track", () => {
  it("captions-burn validates and writes its cue in frames", () => {
    const run = video(["validate", "--print-ir", copyProject("captions-burn")]);
    assert.equal(run.status, 0, run.stderr);
    const ir = JSON.parse(run.stdout) as Record<string, unknown>;
    assert.equal(ir["schemaVersion"], "1.11");
    assert.deepEqual(ir["captions"], {
      mode: "burn",
      src: "assets/captions.vtt",
      cues: [
        {
          startFrame: 15,
          endFrame: 45,
          text: "A long caption cue, set to wrap onto a second line in the box.",
        },
      ],
    });
  });

  it("captions-invalid yields exactly the codes, files and VTT lines of expected.json", () => {
    const expected = JSON.parse(
      readFileSync(join(FIXTURES, "captions-invalid", "expected.json"), "utf8"),
    ) as Array<Record<string, unknown>>;
    const run = video(["validate", "--json", copyProject("captions-invalid")]);
    assert.equal(run.status, 1, run.stderr);
    const actual = JSON.parse(run.stdout) as Array<Record<string, unknown>>;
    assert.deepEqual(
      actual.map((d) => ({
        code: d["code"],
        file: d["file"],
        line: d["line"],
      })),
      expected,
    );
  });

  for (const mode of ["sidecar", "both", "burn"]) {
    const sidecar = mode !== "burn";
    it(`mode ${mode} ${sidecar ? "writes output.vtt next to output.mp4" : "writes no sidecar"}`, () => {
      const project = copyProject("captions-burn", mode);
      const run = video(["render", project], {
        QV_BROWSER_EXECUTABLE: browser,
      });
      assert.equal(run.status, 0, run.stderr);
      assert.ok(
        existsSync(join(project, "output.mp4")),
        "output.mp4 is written",
      );
      const vtt = join(project, "output.vtt");
      if (!sidecar) {
        assert.equal(existsSync(vtt), false, "no output.vtt in burn mode");
        return;
      }
      assert.equal(
        readFileSync(vtt, "utf8"),
        readFileSync(
          join(FIXTURES, "captions-burn", "assets", "captions.vtt"),
          "utf8",
        ),
        "output.vtt is the caption file",
      );
    });
  }
});
