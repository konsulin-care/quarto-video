// `video validate <path> [--print-ir | --json]`: stages 1–2 (check.ts). Exit
// codes: 0 OK, 1 validation errors, 2 usage/path problems.
// Output: the OK line on stdout (on stderr with --print-ir, which keeps stdout
// for the IR JSON only). Diagnostics go to stderr as text, or with --json to
// stdout as a JSON array (report.ts); with --json nothing else is printed.
import { timelineOf } from "@quarto-video/ir";
import { checkProject } from "../check.js";
import { EXIT_USAGE } from "../exit-codes.js";
import { exitCodeFor } from "../exit-status.js";
import { ProjectError, resolveProject } from "../project.js";
import { report } from "../report.js";

export interface ValidateOptions {
  /** The path as the user typed it (directory or `.qmd` file). */
  path: string;
  printIr: boolean;
  json: boolean;
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

  const check = checkProject(project);
  if (check.kind === "environment") {
    process.stderr.write(`video: ${check.message}\n`);
    return EXIT_USAGE;
  }
  if (check.kind === "invalid") {
    report(check.diagnostics, options.json);
    return exitCodeFor(check.diagnostics);
  }
  if (options.json) {
    report(check.diagnostics, true);
    return exitCodeFor(check.diagnostics);
  }

  report(check.diagnostics, false);
  const ir = check.ir;
  // The timeline total, not the sum of scene lengths: transitions overlap.
  const frames = timelineOf(ir).durationFrames;
  const summary = `OK ${project.name} (${ir.scenes.length} scenes, ${frames} frames)\n`;
  if (options.printIr) {
    process.stdout.write(`${JSON.stringify(ir, null, 2)}\n`);
    process.stderr.write(summary);
  } else {
    process.stdout.write(summary);
  }
  return exitCodeFor(check.diagnostics);
}
