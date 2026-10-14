// Runs the task-003 Lua filter with the documented Pandoc invocation
// (_extensions/video/README.md) and reads the manifest it writes. The filter
// writes only <project>/.video-build/manifest.json; nothing else runs here.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { Project } from "./project.js";

const FILTER = fileURLToPath(
  new URL("../../../_extensions/video/video.lua", import.meta.url),
);
const MANIFEST_RELATIVE = join(".video-build", "manifest.json");

export type FilterOutcome =
  /** The filter ran and its manifest parsed as JSON (not yet schema-checked). */
  | { kind: "manifest"; json: unknown }
  /** The document was rejected by the filter (a validation error, exit 1). */
  | { kind: "rejected"; message: string }
  /** Quarto could not be started (a usage or environment error, exit 2). */
  | { kind: "environment"; message: string };

/** Reduces Quarto's stderr to the filter's own message (drops the traceback). */
function filterMessage(stderr: string): string {
  const parts: string[] = [];
  for (const line of stderr.split("\n")) {
    if (line.startsWith("stack traceback:")) break;
    if (line.startsWith("Error running filter")) continue;
    if (line.trim() !== "") parts.push(line.trim());
  }
  return parts.join(" ") || "the Lua filter failed";
}

/** Absolute path of the IR manifest the filter writes for `project`. */
export function manifestPath(project: Project): string {
  return join(project.root, MANIFEST_RELATIVE);
}

/** Runs the filter on `project.document` and returns the parsed manifest. */
export function runFilter(project: Project): FilterOutcome {
  const result = spawnSync(
    "quarto",
    [
      "pandoc",
      project.document,
      "--from",
      "markdown",
      "--to",
      "native",
      "--lua-filter",
      FILTER,
    ],
    {
      cwd: project.root,
      stdio: ["ignore", "ignore", "pipe"],
      encoding: "utf8",
    },
  );
  if (result.error !== undefined) {
    return {
      kind: "environment",
      message: `cannot run quarto (${result.error.message}); install the version pinned in mise.toml`,
    };
  }
  if (result.status !== 0) {
    const document = relative(project.root, project.document);
    return {
      kind: "rejected",
      message: `${document}: ${filterMessage(result.stderr)}`,
    };
  }
  try {
    const text = readFileSync(manifestPath(project), "utf8");
    return { kind: "manifest", json: JSON.parse(text) as unknown };
  } catch {
    const document = relative(project.root, project.document);
    return {
      kind: "rejected",
      message: `${document}: the filter did not write a readable manifest`,
    };
  }
}
