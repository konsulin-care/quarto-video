// `video render <path>`: stages 1–2 (check.ts), then the renderer writes to a
// temp file in .video-build/ and it is renamed to video.output only on success
// (PRD §4.2, §11.2). stdout: `NN%` progress lines, then `Wrote <path>`.
// stderr: errors. Exit codes: 0 OK, 1 validation or render failure, 2 usage.
import { mkdir, rename, rm } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import type { RenderFn, RenderProgress } from "@quarto-video/remotion";
import { checkProject } from "../check.js";
import { EXIT_INVALID, EXIT_OK, EXIT_USAGE } from "../exit-codes.js";
import { exitCodeFor } from "../exit-status.js";
import { manifestPath } from "../filter.js";
import { outputPath } from "../render-config.js";
import { ProjectError, resolveProject } from "../project.js";
import { report } from "../report.js";

/** Partial output, inside the build dir; never left behind (see the CLI README). */
const TEMP_RELATIVE = join(".video-build", "render.partial.mp4");

export interface RenderOptions {
  /** The path as the user typed it (directory or `.qmd` file). */
  path: string;
  /** Existing Chromium headless shell (QV_BROWSER_EXECUTABLE); null lets Remotion decide. */
  browserExecutable: string | null;
  /** Diagnostics as a JSON array on stdout (report.ts). */
  json: boolean;
}

/** Prints each whole-percent change once: `42%`. */
function percentPrinter(): (progress: RenderProgress) => void {
  let last = -1;
  return ({ encodedFrames, totalFrames }) => {
    const percent =
      totalFrames > 0
        ? Math.min(100, Math.floor((encodedFrames * 100) / totalFrames))
        : 100;
    if (percent !== last) {
      last = percent;
      process.stdout.write(`${percent}%\n`);
    }
  };
}

function reason(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Renders the project at `options.path`. Returns the exit code. */
export async function runRender(
  options: RenderOptions,
  cwd: string,
  renderer: RenderFn,
): Promise<number> {
  let project;
  try {
    project = resolveProject(options.path, cwd);
  } catch (err) {
    if (!(err instanceof ProjectError)) throw err;
    process.stderr.write(`video: ${err.message}\n`);
    return EXIT_USAGE;
  }

  const check = checkProject(project);
  if (check.kind === "environment") {
    process.stderr.write(`video: ${check.message}\n`);
    return EXIT_USAGE;
  }
  if (check.kind === "invalid") {
    report(check.diagnostics, options.json);
    return exitCodeFor(check.diagnostics);
  }
  // Warnings do not stop the render; with --json they are printed first.
  report(check.diagnostics, options.json);

  const temp = join(project.root, TEMP_RELATIVE);
  try {
    const output = outputPath(project);
    await rm(temp, { force: true });
    await renderer(manifestPath(project), temp, {
      browserExecutable: options.browserExecutable,
      onProgress: percentPrinter(),
    });
    await mkdir(dirname(output), { recursive: true });
    await rename(temp, output);
    process.stdout.write(`Wrote ${relative(cwd, output)}\n`);
    return EXIT_OK;
  } catch (err) {
    await rm(temp, { force: true });
    process.stderr.write(`video: render failed: ${reason(err)}\n`);
    return EXIT_INVALID;
  }
}
