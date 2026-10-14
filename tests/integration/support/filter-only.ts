// Stage 1 only: runs the Lua filter on a scratch project and returns the
// manifest it wrote (the documented invocation, _extensions/video/README.md).
// Golden tests use it for fixtures whose components the registry does not
// have, so `video validate` (stages 1–2, task 014) would reject them.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const FILTER = fileURLToPath(
  new URL("../../../_extensions/video/video.lua", import.meta.url),
);

export interface FilterRun {
  status: number | null;
  /** The manifest text when the filter succeeded; empty otherwise. */
  stdout: string;
  stderr: string;
}

/** Runs the filter on `<root>/index.qmd` and reads `.video-build/manifest.json`. */
export function filterOnly(root: string): FilterRun {
  const result = spawnSync(
    "quarto",
    [
      "pandoc",
      "index.qmd",
      "--from",
      "markdown",
      "--to",
      "native",
      "--lua-filter",
      FILTER,
    ],
    { cwd: root, encoding: "utf8" },
  );
  if (result.error !== undefined) throw result.error;
  let stdout = "";
  if (result.status === 0) {
    stdout = readFileSync(join(root, ".video-build", "manifest.json"), "utf8");
  }
  return { status: result.status, stdout, stderr: result.stderr };
}
