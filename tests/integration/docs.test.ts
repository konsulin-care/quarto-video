// Docs test (task 050): the user guides in docs/guides/ stay true to the
// validator's diagnostic codes, the `video` CLI's commands and flags, and the
// example projects they show. Runs in the pure integration suite (no browser).
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";
import { strict as assert } from "node:assert";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const GUIDES = join(ROOT, "docs", "guides");
const VIDEO = join(ROOT, "node_modules", ".bin", "video");
const TEMPLATE = join(ROOT, "videos", "_template");
const VALIDATOR_README = join(ROOT, "packages", "validator", "README.md");
const DIAGNOSTICS_GUIDE = join(GUIDES, "diagnostics.md");

/**
 * `qmd` fences that are fragments, not complete projects. Each entry matches a
 * fence by a substring of its body and gives the reason. Keep it short: prefer a
 * `markdown` fence for a fragment.
 */
const FRAGMENT_ALLOWLIST: { file: string; contains: string; reason: string }[] =
  [];

interface Fence {
  file: string;
  line: number;
  lang: string;
  body: string;
}

const tempDirs: string[] = [];
after(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

function guideFiles(): string[] {
  return readdirSync(GUIDES)
    .filter((name) => name.endsWith(".md"))
    .sort();
}

/** Every fenced block of a guide, with its language and body. */
function fencesOf(file: string): Fence[] {
  const lines = readFileSync(join(GUIDES, file), "utf8").split("\n");
  const fences: Fence[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const open = /^```(\S*)\s*$/.exec(lines[i] ?? "");
    if (!open) continue;
    const start = i + 2;
    const body: string[] = [];
    for (i += 1; i < lines.length && lines[i] !== "```"; i += 1) {
      body.push(lines[i] ?? "");
    }
    fences.push({
      file,
      line: start,
      lang: open[1] ?? "",
      body: `${body.join("\n")}\n`,
    });
  }
  return fences;
}

/** Text outside fenced blocks, and the inside of fenced shell and text blocks. */
function codeTextOf(file: string): string[] {
  const lines = readFileSync(join(GUIDES, file), "utf8").split("\n");
  const out: string[] = [];
  let fence: string | null = null;
  for (const line of lines) {
    if (fence === null) {
      const open = /^```(\S*)\s*$/.exec(line);
      if (open) {
        fence = open[1] ?? "";
        continue;
      }
      // Inline code spans in prose.
      for (const span of line.matchAll(/`([^`]+)`/g)) out.push(span[1] ?? "");
    } else if (line === "```") {
      fence = null;
    } else if (["sh", "bash", "console", "text"].includes(fence)) {
      out.push(line);
    }
  }
  return out;
}

/** Diagnostic codes of the table in packages/validator/README.md. */
function validatorCodes(): string[] {
  const codes: string[] = [];
  for (const line of readFileSync(VALIDATOR_README, "utf8").split("\n")) {
    const row = /^\| `([EW]_[A-Z0-9_]+)`\s*\|/.exec(line);
    if (row) codes.push(row[1] ?? "");
  }
  return codes;
}

function runVideo(args: string[]) {
  return spawnSync(VIDEO, args, { cwd: ROOT, encoding: "utf8" });
}

function tempProject(body: string): string {
  const dir = mkdtempSync(join(tmpdir(), "qv-docs-"));
  tempDirs.push(dir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.qmd"), body);
  return dir;
}

const HELP = runVideo(["--help"]);
const HELP_TEXT = `${HELP.stdout}${HELP.stderr}`;

describe("docs/guides diagnostics", () => {
  it("names every diagnostic code of packages/validator/README.md", () => {
    const codes = validatorCodes();
    assert.ok(codes.length >= 50, `found only ${codes.length} codes`);
    const guide = readFileSync(DIAGNOSTICS_GUIDE, "utf8");
    const missing = codes.filter((code) => !guide.includes(`\`${code}\``));
    assert.deepEqual(missing, [], "codes missing from diagnostics.md");
  });
});

describe("docs/guides CLI names", () => {
  it("`video --help` exits 0 and prints the usage", () => {
    assert.equal(HELP.status, 0);
    assert.match(HELP_TEXT, /video validate/);
  });

  it("names only commands that exist in `video --help`", () => {
    const names = new Set<string>();
    for (const file of guideFiles()) {
      for (const text of codeTextOf(file)) {
        for (const m of text.matchAll(/\bvideo ([a-z][a-z-]*)/g)) {
          names.add(m[1] ?? "");
        }
      }
    }
    assert.ok(names.has("validate") && names.has("render"));
    const unknown = [...names].filter(
      (name) => !HELP_TEXT.includes(`video ${name}`),
    );
    assert.deepEqual(unknown, [], "commands not in video --help");
  });

  it("names only flags that exist in `video --help`", () => {
    const flags = new Set<string>();
    for (const file of guideFiles()) {
      for (const text of codeTextOf(file)) {
        const m = /video (validate|render|components|doctor)\b(.*)/.exec(text);
        if (!m) continue;
        for (const flag of (m[2] ?? "").matchAll(/--[a-z][a-z-]*/g)) {
          flags.add(flag[0]);
        }
      }
    }
    assert.ok(flags.has("--json"));
    const unknown = [...flags].filter(
      (flag) => flag !== "--help" && !HELP_TEXT.includes(flag),
    );
    assert.deepEqual(unknown, [], "flags not in video --help");
  });
});

describe("docs/guides example projects", () => {
  for (const file of guideFiles()) {
    it(`every qmd project in ${file} validates or is allow-listed`, () => {
      const projects = fencesOf(file).filter(
        (fence) =>
          fence.lang === "qmd" &&
          (fence.body.startsWith("---") || fence.body.includes(".scene")),
      );
      for (const entry of FRAGMENT_ALLOWLIST.filter((e) => e.file === file)) {
        assert.ok(
          projects.some((fence) => fence.body.includes(entry.contains)),
          `allow-list entry matches no fence: ${entry.contains}`,
        );
      }
      for (const fence of projects) {
        const skip = FRAGMENT_ALLOWLIST.some(
          (entry) => entry.file === file && fence.body.includes(entry.contains),
        );
        if (skip) continue;
        const result = runVideo(["validate", tempProject(fence.body)]);
        assert.equal(
          result.status,
          0,
          `${file}:${fence.line} does not validate:\n${result.stdout}${result.stderr}`,
        );
      }
    });
  }
});

describe("videos/_template", () => {
  it("validates with exit 0 and no diagnostics", () => {
    const text = runVideo(["validate", TEMPLATE]);
    assert.equal(text.status, 0, text.stderr);
    assert.match(text.stdout, /^OK _template /);
    const json = runVideo(["validate", TEMPLATE, "--json"]);
    assert.equal(json.status, 0);
    assert.deepEqual(JSON.parse(json.stdout), []);
  });
});
