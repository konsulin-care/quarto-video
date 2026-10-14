// `video validate <path> [--print-ir]`: filter, then validateIr (PRD §9.1
// stages 1–2). Exit codes: 0 OK, 1 validation errors, 2 usage/path problems.
// Output: the OK line on stdout (on stderr with --print-ir, which keeps stdout
// for the IR JSON only); errors as `<json-path>: <message>` lines on stderr.
import type { IrVideo } from "@quarto-video/ir";
import { validateIr } from "@quarto-video/ir";
import { runFilter } from "../filter.js";
import { ProjectError, resolveProject } from "../project.js";

export const EXIT_OK = 0;
export const EXIT_INVALID = 1;
export const EXIT_USAGE = 2;

export interface ValidateOptions {
  /** The path as the user typed it (directory or `.qmd` file). */
  path: string;
  printIr: boolean;
}

/** Runs validation for one project and writes the result. Returns the exit code. */
export function runValidate(options: ValidateOptions, cwd: string): number {
  let project;
  try {
    project = resolveProject(options.path, cwd);
  } catch (err) {
    if (!(err instanceof ProjectError)) throw err;
    process.stderr.write(`video: ${err.message}\n`);
    return EXIT_USAGE;
  }

  const outcome = runFilter(project);
  if (outcome.kind === "environment") {
    process.stderr.write(`video: ${outcome.message}\n`);
    return EXIT_USAGE;
  }
  if (outcome.kind === "rejected") {
    process.stderr.write(`${outcome.message}\n`);
    return EXIT_INVALID;
  }

  const result = validateIr(outcome.json);
  if (!result.ok) {
    for (const error of result.errors) {
      process.stderr.write(`${error.path || "(root)"}: ${error.message}\n`);
    }
    return EXIT_INVALID;
  }

  const ir = outcome.json as IrVideo;
  const frames = ir.scenes.reduce(
    (sum, scene) => sum + scene.durationFrames,
    0,
  );
  const summary = `OK ${project.name} (${ir.scenes.length} scenes, ${frames} frames)\n`;
  if (options.printIr) {
    process.stdout.write(`${JSON.stringify(ir, null, 2)}\n`);
    process.stderr.write(summary);
  } else {
    process.stdout.write(summary);
  }
  return EXIT_OK;
}
