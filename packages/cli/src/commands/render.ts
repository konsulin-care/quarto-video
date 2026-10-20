// `video render <path>`: stages 1–4 (check.ts), then the stage 5 gate the CLI
// supplies (cli.ts runs preflight.ts), then the renderer writes to a temp file in
// .video-build/. Stage 6 (the output check) runs on that file, and it is renamed
// to video.output only when it matches the IR (PRD §4.2, §9.1, §11.2). stdout:
// `NN%` progress lines, then `Wrote <path>`. stderr: errors. Exit codes: 0 OK,
// 1 validation or render failure, 2 usage or environment (preflight). On success it
// also writes .video-build/build-info.json (build-info.ts, task 049).
import { copyFile, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import type { RenderFn, RenderProgress } from "@quarto-video/remotion";
import { checkOutput, hasErrors } from "@quarto-video/validator";
import { checkProject } from "../check.js";
import {
  BUILD_INFO_RELATIVE,
  buildInfo,
  writeBuildInfo,
} from "../build-info.js";
import { EXIT_INVALID, EXIT_OK, EXIT_USAGE } from "../exit-codes.js";
import { exitCodeFor } from "../exit-status.js";
import {
  explicitBackground,
  outputPath,
  sidecarPath,
} from "../render-config.js";
import { ProjectError, resolveProject } from "../project.js";
import { report } from "../report.js";
import { readOutputFacts } from "../output-probe.js";
import { detectTools } from "../tools.js";

/** Partial output, inside the build dir; never left behind (see the CLI README). */
const TEMP_RELATIVE = join(".video-build", "render.partial.mp4");
const BUILD_RELATIVE = ".video-build";
// The validated IR the renderer reads: CSV tables are resolved here (ADR-0014).
const RESOLVED_RELATIVE = join(".video-build", "resolved.json");

export interface RenderOptions {
  /** The path as the user typed it (directory or `.qmd` file). */
  path: string;
  /** Existing Chromium headless shell (QV_BROWSER_EXECUTABLE); null lets Remotion decide. */
  browserExecutable: string | null;
  /** Diagnostics as a JSON array on stdout (report.ts). */
  json: boolean;
  /** Theme name from `--theme`; null or unset falls back to front matter, then `modern`. */
  theme?: string | null;
  /**
   * Stage 5 gate, supplied by the CLI boundary (cli.ts) and run after stages 1–4
   * pass. Given the output path and the build dir, it returns problem lines; an
   * empty list lets the render start. Unset skips it, so the render alone runs
   * with no browser or tools (tests inject a renderer this way).
   */
  preflight?: ((output: string, buildDir: string) => string[]) | null;
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
    const problems =
      options.preflight?.(output, join(project.root, BUILD_RELATIVE)) ?? [];
    if (problems.length > 0) {
      for (const problem of problems) {
        process.stderr.write(`video: ${problem}\n`);
      }
      return EXIT_USAGE;
    }
    await rm(temp, { force: true });
    await rm(join(project.root, BUILD_INFO_RELATIVE), { force: true });
    const resolved = join(project.root, RESOLVED_RELATIVE);
    const irText = `${JSON.stringify(check.ir, null, 2)}\n`;
    await mkdir(dirname(resolved), { recursive: true });
    await writeFile(resolved, irText);
    try {
      await renderer(resolved, temp, {
        browserExecutable: options.browserExecutable,
        onProgress: percentPrinter(),
        theme: check.theme,
        background: explicitBackground(project),
        assetRoot: project.root,
        workDir: join(project.root, BUILD_RELATIVE),
      });
    } finally {
      await rm(resolved, { force: true });
    }
    const found = checkOutput(
      check.ir,
      readOutputFacts(temp, relative(project.root, output)),
    );
    if (hasErrors(found)) {
      await rm(temp, { force: true });
      report(found, options.json);
      return exitCodeFor(found);
    }
    // Build info is validated before the output is renamed into place (task 049).
    const info = await buildInfo({
      root: project.root,
      ir: check.ir,
      irText,
      flags: { json: options.json, theme: options.theme ?? null },
      tools: detectTools(),
    });
    await mkdir(dirname(output), { recursive: true });
    // Sidecar and both modes copy the validated caption file beside the output (ADR-0019).
    const captions = "captions" in check.ir ? check.ir.captions : undefined;
    const sidecar =
      captions !== undefined &&
      (captions.mode === "sidecar" || captions.mode === "both")
        ? sidecarPath(output)
        : null;
    if (sidecar !== null && captions !== undefined) {
      await copyFile(join(project.root, captions.src), sidecar);
    }
    await rename(temp, output);
    await writeBuildInfo(project.root, info);
    process.stdout.write(`Wrote ${relative(cwd, output)}\n`);
    if (sidecar !== null) {
      process.stdout.write(`Wrote ${relative(cwd, sidecar)}\n`);
    }
    return EXIT_OK;
  } catch (err) {
    await rm(temp, { force: true });
    process.stderr.write(`video: render failed: ${reason(err)}\n`);
    return EXIT_INVALID;
  }
}
