// Prints a command's diagnostics (packages/cli/README.md). Human text goes to
// stderr. With --json the array goes to stdout instead, one document.
import {
  formatHuman,
  formatJson,
  type Diagnostic,
} from "@quarto-video/validator";

export function report(list: readonly Diagnostic[], json: boolean): void {
  if (json) {
    process.stdout.write(formatJson(list));
    return;
  }
  const text = formatHuman(list);
  if (text !== "") process.stderr.write(text);
}
