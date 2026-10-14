// Entry point of the `video` command (packages/cli/README.md).
// Usage errors exit 2; the commands themselves set their own exit codes.
import { EXIT_USAGE } from "./exit-codes.js";
import { runRender } from "./commands/render.js";
import { runValidate } from "./commands/validate.js";
import { selectRenderer } from "./renderer-port.js";

const USAGE =
  "usage: video validate <path> [--print-ir]\n" +
  "       video render <path>\n";

async function renderCommand(args: string[]): Promise<number> {
  const flags = args.filter((arg) => arg.startsWith("-"));
  const paths = args.filter((arg) => !arg.startsWith("-"));
  if (flags.length > 0 || paths.length !== 1) {
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
      path: paths[0] ?? "",
      browserExecutable: process.env["QV_BROWSER_EXECUTABLE"] ?? null,
    },
    process.cwd(),
    renderer,
  );
}

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  if (command === "--help" || command === "-h") {
    process.stdout.write(USAGE);
    return 0;
  }
  if (command === "render") return renderCommand(rest);
  if (command !== "validate") {
    process.stderr.write(USAGE);
    return EXIT_USAGE;
  }
  const flags = rest.filter((arg) => arg.startsWith("-"));
  const paths = rest.filter((arg) => !arg.startsWith("-"));
  const unknown = flags.filter((flag) => flag !== "--print-ir");
  if (unknown.length > 0 || paths.length !== 1) {
    process.stderr.write(USAGE);
    return EXIT_USAGE;
  }
  return runValidate(
    { path: paths[0] ?? "", printIr: flags.includes("--print-ir") },
    process.cwd(),
  );
}

process.exitCode = await main(process.argv.slice(2));
