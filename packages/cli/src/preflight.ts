// Stage 5 (PRD §9.1, §11.2): the environment can render before the renderer
// starts. Problems are returned as lines for stderr; any problem exits 2 and
// the renderer is never called. `preflightProblems` is pure, so the unit tests
// drive every rule without a real machine (packages/cli/test/preflight.test.ts).
import { accessSync, constants, statfsSync } from "node:fs";
import { dirname, relative } from "node:path";
import { detectTools, type ToolStatus } from "./tools.js";

/** Free space the render needs in the output's filesystem (a fixed heuristic, see the CLI README). */
export const MIN_FREE_BYTES = 256 * 1024 * 1024;

export interface PreflightInput {
  tools: readonly ToolStatus[];
  /** Absolute directories that receive files during the render. */
  writeDirs: readonly string[];
  /** Absolute directory whose filesystem receives the output. */
  outputDir: string;
  writable: (dir: string) => boolean;
  /** Free bytes on the filesystem holding `dir`; null when unknown. */
  freeBytes: (dir: string) => number | null;
  /** How a directory is named in messages (relative to the caller's cwd). */
  display: (dir: string) => string;
}

/** Every problem, one line each; an empty list means the render may start. */
export function preflightProblems(input: PreflightInput): string[] {
  const toolProblems = input.tools.flatMap((tool) =>
    tool.ok ? [] : [`${tool.tool} is not available: ${tool.hint ?? ""}`],
  );
  const dirs = [...new Set(input.writeDirs)];
  const writeProblems = dirs.flatMap((dir) =>
    input.writable(dir)
      ? []
      : [`output directory not writable: ${input.display(dir)}`],
  );
  const free = input.freeBytes(input.outputDir);
  const diskProblems =
    free === null
      ? [`cannot read free disk space in ${input.display(input.outputDir)}`]
      : free < MIN_FREE_BYTES
        ? [
            `not enough free disk space in ${input.display(input.outputDir)}: ` +
              `need ${MIN_FREE_BYTES / (1024 * 1024)} MiB, have ${Math.floor(free / (1024 * 1024))} MiB`,
          ]
        : [];
  return [...toolProblems, ...writeProblems, ...diskProblems];
}

/** The nearest existing directory at or above `dir`: where a new file would land. */
function existingAncestor(dir: string): string {
  let current = dir;
  for (;;) {
    try {
      accessSync(current, constants.F_OK);
      return current;
    } catch {
      const parent = dirname(current);
      if (parent === current) return current;
      current = parent;
    }
  }
}

function writable(dir: string): boolean {
  try {
    accessSync(dir, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function freeBytes(dir: string): number | null {
  try {
    const info = statfsSync(dir);
    return info.bavail * info.bsize;
  } catch {
    return null;
  }
}

/**
 * Stage 5 for one render: `output` is the absolute video.output path and
 * `buildDir` the project's .video-build directory (the temp file lives there).
 */
export function runPreflight(
  output: string,
  buildDir: string,
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const outputDir = existingAncestor(dirname(output));
  return preflightProblems({
    tools: detectTools(env),
    writeDirs: [outputDir, existingAncestor(buildDir)],
    outputDir,
    writable,
    freeBytes,
    display: (dir) => relative(cwd, dir) || ".",
  });
}
