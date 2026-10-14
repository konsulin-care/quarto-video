// Runs the task-003 Lua filter with the documented Pandoc invocation
// (_extensions/video/README.md) and reads the manifest and diagnostics it
// writes. The filter writes only files under <project>/.video-build/; nothing
// else runs here.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { hasErrors, type Diagnostic } from "@quarto-video/validator";
import { filterFailure, readFilterDiagnostics } from "./filter-diagnostics.js";
import type { Project } from "./project.js";

const FILTER = fileURLToPath(
  new URL("../../../_extensions/video/video.lua", import.meta.url),
);
const MANIFEST_RELATIVE = join(".video-build", "manifest.json");

export type FilterOutcome =
  /** The filter ran; `diagnostics` hold warnings only. The manifest is not yet schema-checked. */
  | { kind: "manifest"; json: unknown; diagnostics: Diagnostic[] }
  /** The document was rejected (exit 1); `diagnostics` hold at least one error. */
  | { kind: "rejected"; diagnostics: Diagnostic[] }
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

/** Runs the filter on `project.document` and returns what it wrote. */
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
  const document = relative(project.root, project.document);
  const written = readFilterDiagnostics(project);
  if (written !== null && hasErrors(written)) {
    return { kind: "rejected", diagnostics: written };
  }
  if (result.status !== 0) {
    const message = filterMessage(result.stderr);
    return {
      kind: "rejected",
      diagnostics: [filterFailure(document, message)],
    };
  }
  if (written === null) {
    return {
      kind: "rejected",
      diagnostics: [
        filterFailure(
          document,
          "the filter did not write readable diagnostics",
        ),
      ],
    };
  }
  try {
    const text = readFileSync(manifestPath(project), "utf8");
    return {
      kind: "manifest",
      json: JSON.parse(text) as unknown,
      diagnostics: written,
    };
  } catch {
    return {
      kind: "rejected",
      diagnostics: [
        filterFailure(document, "the filter did not write a readable manifest"),
      ],
    };
  }
}
