// Scene content as typed blocks and slots through the real `video` bin
// (task 012; ADR-0004). The golden tests read the stage-1 IR of
// tests/fixtures/projects/content-nodes with the filter alone: its components
// are not in the registry yet, so `video validate` rejects it (task 014). The
// other tests check that unsupported Markdown is an error at its own line.
// Fixtures are copied to a scratch dir, so the filter's .video-build never
// lands in tests/fixtures.
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { validateIr } from "@quarto-video/ir";
import { parseDiagnostics, type Diagnostic } from "@quarto-video/validator";
import { filterOnly } from "./support/filter-only.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const BIN_DIR = join(ROOT, "node_modules", ".bin");
const FIXTURES = join(ROOT, "tests", "fixtures", "projects");
const SCRATCH = mkdtempSync(join(tmpdir(), "video-content-"));
// Pandoc's element names. They must not appear as IR keys or node types;
// author text is free (it may say "Plain text").
const PANDOC_NAMES = new Set([
  "Pandoc",
  "Meta",
  "Para",
  "Plain",
  "Str",
  "Space",
  "SoftBreak",
  "LineBreak",
  "Div",
  "Span",
  "Emph",
  "Strong",
  "Quoted",
  "Code",
  "CodeBlock",
  "Header",
  "BulletList",
  "OrderedList",
  "Table",
  "RawBlock",
  "RawInline",
  "Note",
  "Math",
  "Link",
  "Image",
  "Figure",
  "BlockQuote",
  "HorizontalRule",
]);

/** Every object key and every "type" value in a parsed JSON value. */
function names(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) names(item, out);
  } else if (typeof value === "object" && value !== null) {
    for (const [key, item] of Object.entries(value)) {
      out.push(key);
      if (key === "type" && typeof item === "string") out.push(item);
      names(item, out);
    }
  }
  return out;
}

interface Run {
  status: number | null;
  stdout: string;
  stderr: string;
}

/** Runs the installed `video` bin from the repository root. */
function video(args: string[]): Run {
  const result = spawnSync(join(BIN_DIR, "video"), args, {
    cwd: ROOT,
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

/** Copies a fixture's index.qmd to a scratch project and returns its directory. */
function copyProject(fixture: string): string {
  const root = join(SCRATCH, fixture);
  mkdirSync(root, { recursive: true });
  copyFileSync(join(FIXTURES, fixture, "index.qmd"), join(root, "index.qmd"));
  return root;
}

/** 1-based line of the first line of `index.qmd` that contains `needle`. */
function lineOf(fixture: string, needle: string): number {
  const lines = readFileSync(
    join(FIXTURES, fixture, "index.qmd"),
    "utf8",
  ).split("\n");
  const index = lines.findIndex((line) => line.includes(needle));
  assert.ok(index >= 0, `"${needle}" is not in ${fixture}`);
  return index + 1;
}

after(() => rmSync(SCRATCH, { recursive: true, force: true }));

describe("scene content nodes", () => {
  it("writes the IR that expected.json describes, and it validates", () => {
    const run = filterOnly(copyProject("content-nodes"));
    assert.equal(run.status, 0, run.stderr);
    const expected: unknown = JSON.parse(
      readFileSync(join(FIXTURES, "content-nodes", "expected.json"), "utf8"),
    );
    assert.deepEqual(JSON.parse(run.stdout), expected);
    assert.deepEqual(validateIr(expected), { ok: true, errors: [] });
  });

  it("keeps Pandoc element names out of the IR keys and node types", () => {
    const run = filterOnly(copyProject("content-nodes"));
    const found = names(JSON.parse(run.stdout)).filter((n) =>
      PANDOC_NAMES.has(n),
    );
    assert.deepEqual(found, []);
  });

  it("puts the CPUs paragraph of the left slot first, as a strong node", () => {
    const run = filterOnly(copyProject("content-nodes"));
    const ir = JSON.parse(run.stdout) as {
      scenes: {
        content: {
          slots: { left: { type: string; inlines: { type: string }[] }[] };
        };
      }[];
    };
    const first = ir.scenes[0]?.content.slots.left[0];
    assert.equal(first?.type, "paragraph");
    assert.equal(first?.inlines[0]?.type, "strong");
  });
});

describe("unsupported scene content", () => {
  it("reports a raw HTML block as E_CONTENT_UNSUPPORTED at its line; exit 1", () => {
    const fixture = "content-unsupported-html";
    const run = video(["validate", copyProject(fixture)]);
    assert.equal(run.status, 1);
    assert.equal(run.stdout, "");
    const line = lineOf(fixture, "<div>x</div>");
    assert.match(run.stderr, new RegExp(`^ERROR index\\.qmd:${line}\\n`));
    assert.match(
      run.stderr,
      /has a block without a slot class, which is not supported/,
    );
  });

  it("reports a table as E_CONTENT_UNSUPPORTED at its header line; exit 1", () => {
    const fixture = "content-unsupported-table";
    const run = video(["validate", "--json", copyProject(fixture)]);
    assert.equal(run.status, 1);
    const list: Diagnostic[] | null = parseDiagnostics(run.stdout);
    assert.ok(list, `stdout is not a valid diagnostics array:\n${run.stdout}`);
    assert.equal(list.length, 1);
    assert.equal(list[0]?.code, "E_CONTENT_UNSUPPORTED");
    assert.equal(list[0]?.sceneId, "scene-001");
    assert.equal(list[0]?.line, lineOf(fixture, "| Chip | Cores |"));
    assert.match(list[0]?.message ?? "", /has a table, which is not supported/);
  });
});
