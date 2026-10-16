// Entry point of the `video` command (packages/cli/README.md).
// Usage errors exit 2; the commands themselves set their own exit codes.
import { EXIT_USAGE } from "./exit-codes.js";
import { runComponents } from "./commands/components.js";
import { runDoctor } from "./commands/doctor.js";
import { runRender } from "./commands/render.js";
import { runValidate } from "./commands/validate.js";
import { parseRenderArgs } from "./render-args.js";
import { runPreflight } from "./preflight.js";
import { selectRenderer } from "./renderer-port.js";

const USAGE =
  "usage: video validate <path> [--print-ir | --json]\n" +
  "       video render <path> [--json] [--theme <name>]\n" +
  "       video components [--json]\n" +
  "       video doctor [--json]\n";

async function renderCommand(args: string[]): Promise<number> {
  const parsed = parseRenderArgs(args);
  if (parsed === null) {
    process.stderr.write(USAGE);
    return EXIT_USAGE;
  }
  let renderer;
  try {
    renderer = await selectRenderer();
  } catch (err) {
    process.stderr.write(
      `video: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    return EXIT_USAGE;
  }
  return runRender(
    {
      path: parsed.path,
      browserExecutable: process.env["QV_BROWSER_EXECUTABLE"] ?? null,
      json: parsed.json,
      theme: parsed.theme,
      // Stage 5 (tools, browser, writable output, disk) runs here, at the CLI
      // boundary, once stages 1–4 have passed inside runRender.
      preflight: (output, buildDir) =>
        runPreflight(output, buildDir, process.cwd()),
    },
    process.cwd(),
    renderer,
  );
}

function componentsCommand(args: string[]): number {
  if (args.some((arg) => arg !== "--json")) {
    process.stderr.write(USAGE);
    return EXIT_USAGE;
  }
  return runComponents({ json: args.includes("--json") });
}

function doctorCommand(args: string[]): number {
  if (args.some((arg) => arg !== "--json")) {
    process.stderr.write(USAGE);
    return EXIT_USAGE;
  }
  return runDoctor({ json: args.includes("--json") });
}

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  if (command === "--help" || command === "-h") {
    process.stdout.write(USAGE);
    return 0;
  }
  if (command === "render") return renderCommand(rest);
  if (command === "components") return componentsCommand(rest);
  if (command === "doctor") return doctorCommand(rest);
  if (command !== "validate") {
    process.stderr.write(USAGE);
    return EXIT_USAGE;
  }
  const flags = rest.filter((arg) => arg.startsWith("-"));
  const paths = rest.filter((arg) => !arg.startsWith("-"));
  const known = ["--print-ir", "--json"];
  const unknown = flags.filter((flag) => !known.includes(flag));
  const printIr = flags.includes("--print-ir");
  const json = flags.includes("--json");
  if (unknown.length > 0 || paths.length !== 1 || (printIr && json)) {
    process.stderr.write(USAGE);
    return EXIT_USAGE;
  }
  return runValidate({ path: paths[0] ?? "", printIr, json }, process.cwd());
}

process.exitCode = await main(process.argv.slice(2));
