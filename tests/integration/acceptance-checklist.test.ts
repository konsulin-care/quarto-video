// Acceptance checklist test (task 051): docs/guides/acceptance-checklist.md has
// one row per PRD §16 bullet (the bullets are read from docs/prd.md, never
// copied here), every evidence link resolves to a file, and every test file a
// row links to is run by an npm script. Pure: no browser, no network.
// Runtime: under 1 s.
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PRD = join(ROOT, "docs", "prd.md");
const CHECKLIST = join(ROOT, "docs", "guides", "acceptance-checklist.md");
const PACKAGE_JSON = join(ROOT, "package.json");
const HEADER = "Criterion (PRD §16)";

interface Row {
  line: number;
  criterion: string;
  links: string[];
}

/** The §16 bullets as the PRD writes them, without the leading "- ". */
function prdCriteria(): string[] {
  const text = readFileSync(PRD, "utf8");
  const start = text.indexOf("\n## 16. Acceptance criteria\n");
  assert.notEqual(start, -1, "docs/prd.md has no section 16");
  const rest = text.slice(start + 1);
  const end = rest.indexOf("\n## ", 1);
  const section = end === -1 ? rest : rest.slice(0, end);
  return section
    .split("\n")
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2));
}

/** The table rows of the checklist: criterion cell and every link in the row. */
function checklistRows(): Row[] {
  const rows: Row[] = [];
  readFileSync(CHECKLIST, "utf8")
    .split("\n")
    .forEach((text, index) => {
      if (!text.startsWith("|")) return;
      const cells = text
        .slice(1, text.lastIndexOf("|"))
        .split("|")
        .map((cell) => cell.trim());
      const criterion = cells[0] ?? "";
      if (criterion === HEADER || /^:?-+:?$/.test(criterion)) return;
      const links = [...text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)].map(
        (match) => match[1] ?? "",
      );
      rows.push({ line: index + 1, criterion, links });
    });
  return rows;
}

/** A link's file, relative to the checklist's folder, without any #anchor. */
function linkedFile(link: string): string {
  return resolve(dirname(CHECKLIST), link.split("#")[0] ?? "");
}

describe("acceptance checklist (PRD §16)", () => {
  it("has one row per §16 bullet, in PRD order, with the bullet's exact text", () => {
    const criteria = prdCriteria();
    assert.ok(criteria.length > 0, "docs/prd.md lists no §16 bullets");
    const rows = checklistRows().map((row) => row.criterion);
    const missing = criteria.filter((c) => !rows.includes(c));
    const extra = rows.filter((c) => !criteria.includes(c));
    assert.deepEqual({ missing, extra }, { missing: [], extra: [] });
    assert.deepEqual(rows, criteria);
  });

  it("gives every row at least one evidence link", () => {
    const empty = checklistRows()
      .filter((row) => row.links.length === 0)
      .map((row) => `line ${row.line}: ${row.criterion}`);
    assert.deepEqual(empty, []);
  });

  it("resolves every evidence link to an existing file", () => {
    const broken: string[] = [];
    for (const row of checklistRows()) {
      for (const link of row.links) {
        const file = linkedFile(link);
        const isFile = existsSync(file) && statSync(file).isFile();
        if (/^[a-z]+:/i.test(link) || !isFile) {
          broken.push(`line ${row.line}: ${link}`);
        }
      }
    }
    assert.deepEqual(broken, []);
  });

  it("names only test files that exist and that an npm script runs", () => {
    const scripts = readFileSync(PACKAGE_JSON, "utf8");
    const unrun: string[] = [];
    for (const row of checklistRows()) {
      for (const link of row.links) {
        if (!link.split("#")[0]?.endsWith(".test.ts")) continue;
        const rel = relative(ROOT, linkedFile(link)).split("\\").join("/");
        if (!scripts.includes(rel)) unrun.push(`line ${row.line}: ${rel}`);
      }
    }
    assert.deepEqual(unrun, []);
  });
});
