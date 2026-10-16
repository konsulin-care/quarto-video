// Loads and validates tests/visual/cases/<case>.json (task 020). An unknown key
// or a malformed value is an error that names the file: a typo must not
// silently weaken a case.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export interface VisualCase {
  /** The case id: the file name without `.json`. */
  name: string;
  /** Fixture project, relative to the repository root. */
  project: string;
  /** Theme id for the stills (themes/tokens.ts). */
  theme: string;
  /** Frame numbers to capture and compare. */
  frames: number[];
  threshold: { channelTolerance: number; maxDiffRatio: number };
}

const KEYS = ["project", "theme", "frames", "threshold"];
const THRESHOLD_KEYS = ["channelTolerance", "maxDiffRatio"];

function fail(name: string, message: string): never {
  throw new Error(`cases/${name}.json: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function checkKeys(
  name: string,
  obj: Record<string, unknown>,
  allowed: string[],
): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) fail(name, `unknown key "${key}"`);
  }
}

/** Parses one case file's contents; `name` is the case id. */
export function parseCase(name: string, json: unknown): VisualCase {
  if (!isRecord(json)) fail(name, "must be a JSON object");
  checkKeys(name, json, KEYS);
  const { project, theme, frames, threshold } = json;
  if (typeof project !== "string" || project === "") {
    fail(name, '"project" must be a non-empty path');
  }
  if (typeof theme !== "string" || theme === "") {
    fail(name, '"theme" must be a theme id');
  }
  if (
    !Array.isArray(frames) ||
    frames.length === 0 ||
    !frames.every((f) => Number.isInteger(f) && f >= 0)
  ) {
    fail(name, '"frames" must be a non-empty list of frame numbers >= 0');
  }
  if (!isRecord(threshold)) fail(name, '"threshold" must be an object');
  checkKeys(name, threshold, THRESHOLD_KEYS);
  const { channelTolerance, maxDiffRatio } = threshold;
  if (
    typeof channelTolerance !== "number" ||
    !Number.isInteger(channelTolerance) ||
    channelTolerance < 0 ||
    channelTolerance > 255
  ) {
    fail(name, '"threshold.channelTolerance" must be an integer 0..255');
  }
  if (
    typeof maxDiffRatio !== "number" ||
    maxDiffRatio < 0 ||
    maxDiffRatio > 1
  ) {
    fail(name, '"threshold.maxDiffRatio" must be a number 0..1');
  }
  return {
    name,
    project,
    theme,
    frames: [...frames],
    threshold: { channelTolerance, maxDiffRatio },
  };
}

/** Reads every case in casesDir (sorted), or only the named ones. */
export async function loadCases(
  casesDir: string,
  only: string[] = [],
): Promise<VisualCase[]> {
  const files = (await readdir(casesDir)).filter((f) => f.endsWith(".json"));
  const names = files.map((f) => f.slice(0, -".json".length)).sort();
  for (const wanted of only) {
    if (!names.includes(wanted)) throw new Error(`no visual case "${wanted}"`);
  }
  const selected = only.length > 0 ? only : names;
  const cases: VisualCase[] = [];
  for (const name of selected) {
    const text = await readFile(join(casesDir, `${name}.json`), "utf8");
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (error) {
      fail(
        name,
        `not valid JSON (${error instanceof Error ? error.message : String(error)})`,
      );
    }
    cases.push(parseCase(name, json));
  }
  return cases;
}
