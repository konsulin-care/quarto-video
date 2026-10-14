// Entry point of the `video` command (packages/cli/README.md).
// Usage errors exit 2; the commands themselves set their own exit codes.
import { EXIT_USAGE, runValidate } from "./commands/validate.js";

const USAGE = "usage: video validate <path> [--print-ir]\n";

function main(argv: string[]): number {
  const [command, ...rest] = argv;
  if (command === "--help" || command === "-h") {
    process.stdout.write(USAGE);
    return 0;
  }
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

process.exitCode = main(process.argv.slice(2));
