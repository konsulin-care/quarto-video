// The supported-version matrix (docs/guides/compatibility.md) read from
// compatibility.json, the single source of truth. `video doctor` uses it to warn
// about a probed version that is not listed. Browser and the CLI's own packages
// are recorded in build-info but not listed (their pins are not one number).
import { readFileSync } from "node:fs";
import type { ToolId } from "./tools.js";

export const MATRIX_DOC = "docs/guides/compatibility.md";

export type Matrix = Partial<Record<ToolId, readonly string[]>>;

/** The matrix file, parsed. Throws when it is missing or malformed. */
export function loadMatrix(): Matrix {
  const url = new URL("./compatibility.json", import.meta.url);
  const data = JSON.parse(readFileSync(url, "utf8")) as { tools?: Matrix };
  if (data.tools === undefined)
    throw new Error("compatibility.json has no tools");
  return data.tools;
}

/** A version without a leading `v` (Node reports `v24.21.0`). */
function bare(version: string): string {
  return version.replace(/^v/, "");
}

/**
 * A warning line when `version` of `tool` is not listed in the matrix, or null
 * when it is listed or the tool has no entry. Exact match after removing a `v`.
 */
export function matrixWarning(
  tool: ToolId,
  version: string,
  matrix: Matrix = loadMatrix(),
): string | null {
  const listed = matrix[tool];
  if (listed === undefined) return null;
  if (listed.includes(bare(version))) return null;
  return `${version} is outside the compatibility matrix (supported: ${listed.join(", ")}; ${MATRIX_DOC})`;
}
