// `video render <path>`: stages 1–4 (check.ts), stage 5 preflight (preflight.ts),
// then the renderer writes to a temp file in .video-build/. Stage 6 (the output
// check) runs on that file, and it is renamed to video.output only when it
// matches the IR (PRD §4.2, §9.1, §11.2). stdout: `NN%` progress lines, then
// `Wrote <path>`. stderr: errors. Exit codes: 0 OK, 1 validation or render
// failure, 2 usage or environment (preflight).
import { mkdir, rename, rm } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import type { RenderFn, RenderProgress } from "@quarto-video/remotion";
import { checkOutput, hasErrors } from "@quarto-video/validator";
import { checkProject } from "../check.js";
import { EXIT_INVALID, EXIT_OK, EXIT_USAGE } from "../exit-codes.js";
import { exitCodeFor } from "../exit-status.js";
import { manifestPath } from "../filter.js";
import { runPreflight } from "../preflight.js";
import { explicitBackground, outputPath } from "../render-config.js";
import { ProjectError, resolveProject } from "../project.js";
import { report } from "../report.js";
import { readOutputFacts } from "../output-probe.js";

/** Partial output, inside the build dir; never left behind (see the CLI README). */
const TEMP_RELATIVE = join(".video-build", "render.partial.mp4");
const BUILD_RELATIVE = ".video-build";

export interface RenderOptions {
  /** The path as the user typed it (directory or `.qmd` file). */
  path: string;
  /** Existing Chromium headless shell (QV_BROWSER_EXECUTABLE); null lets Remotion decide. */
  browserExecutable: string | null;
  /** Diagnostics as a JSON array on stdout (report.ts). */
  json: boolean;
  /** Theme name from `--theme`; null or unset falls back to front matter, then `modern`. */
  theme?: string | null;
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

  const check = checkProject(project, options.theme ?? null);
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
    const problems = runPreflight(
      output,
      join(project.root, BUILD_RELATIVE),
      cwd,
    );
    if (problems.length > 0) {
      for (const problem of problems) {
        process.stderr.write(`video: ${problem}\n`);
      }
      return EXIT_USAGE;
    }
    await rm(temp, { force: true });
    await renderer(manifestPath(project), temp, {
      browserExecutable: options.browserExecutable,
      onProgress: percentPrinter(),
      theme: check.theme,
      background: explicitBackground(project),
    });
    const found = checkOutput(
      check.ir,
      readOutputFacts(temp, relative(project.root, output)),
    );
    if (hasErrors(found)) {
      await rm(temp, { force: true });
      report(found, options.json);
      return exitCodeFor(found);
    }
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
