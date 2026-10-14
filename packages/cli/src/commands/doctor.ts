// `video doctor [--json]`: the tools a render needs, with versions or the
// reason and fix for each one (PRD §9.1 stage 5; packages/cli/README.md).
// Human: one line per tool on stdout, ✓ or ✗. --json: an array of
// { tool, ok, version, hint }. Exit 0 when every tool is ok, else 2.
import { EXIT_OK, EXIT_USAGE } from "../exit-codes.js";
import { detectTools } from "../tools.js";

export interface DoctorOptions {
  json: boolean;
}

export function runDoctor(
  options: DoctorOptions,
  env: NodeJS.ProcessEnv = process.env,
): number {
  const tools = detectTools(env);
  if (options.json) {
    process.stdout.write(`${JSON.stringify(tools, null, 2)}\n`);
  } else {
    for (const tool of tools) {
      const line = tool.ok
        ? `✓ ${tool.tool.padEnd(9)} ${tool.version ?? ""}`
        : `✗ ${tool.tool.padEnd(9)} ${tool.hint ?? ""}`;
      process.stdout.write(`${line}\n`);
    }
  }
  return tools.every((tool) => tool.ok) ? EXIT_OK : EXIT_USAGE;
}
