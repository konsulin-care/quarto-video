// Exit status of a command from its diagnostics (PRD §9.2): any error fails
// with EXIT_INVALID; warnings alone, or no diagnostics, exit with EXIT_OK.
// `validate` and `render` both return this for their validation outcome.
import { hasErrors, type Diagnostic } from "@quarto-video/validator";
import { EXIT_INVALID, EXIT_OK } from "./exit-codes.js";

export function exitCodeFor(diagnostics: readonly Diagnostic[]): number {
  return hasErrors(diagnostics) ? EXIT_INVALID : EXIT_OK;
}
