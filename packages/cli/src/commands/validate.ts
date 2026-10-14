// `video validate <path> [--print-ir]`: stages 1–2 (check.ts). Exit codes:
// 0 OK, 1 validation errors, 2 usage/path problems.
// Output: the OK line on stdout (on stderr with --print-ir, which keeps stdout
// for the IR JSON only); errors as `<json-path>: <message>` lines on stderr.
import { checkProject } from "../check.js";
import { EXIT_INVALID, EXIT_OK, EXIT_USAGE } from "../exit-codes.js";
import { ProjectError, resolveProject } from "../project.js";

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

  const check = checkProject(project);
  if (check.kind === "environment") {
    process.stderr.write(`video: ${check.message}\n`);
    return EXIT_USAGE;
  }
  if (check.kind === "invalid") {
    for (const line of check.lines) process.stderr.write(`${line}\n`);
    return EXIT_INVALID;
  }

  const ir = check.ir;
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
