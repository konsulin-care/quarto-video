// Formatters for diagnostics (PRD §9.2). The human format is the block shape
// of the PRD examples: a header with severity and location, the message,
// then the suggestion. Blocks are separated by a blank line.
import type { Diagnostic, Severity } from "./diagnostic.js";

const LABEL: Record<Severity, string> = { error: "ERROR", warning: "WARNING" };

function block(diagnostic: Diagnostic): string {
  const location =
    diagnostic.file === undefined
      ? ""
      : ` ${diagnostic.file}${diagnostic.line === undefined ? "" : `:${diagnostic.line}`}`;
  const lines = [
    `${LABEL[diagnostic.severity]}${location}`,
    diagnostic.message,
  ];
  if (diagnostic.suggestion !== undefined) lines.push(diagnostic.suggestion);
  return `${lines.join("\n")}\n`;
}

/** Human-readable text for `list`; empty when there are no diagnostics. */
export function formatHuman(list: readonly Diagnostic[]): string {
  return list.map(block).join("\n");
}

/** A JSON array of the diagnostics, one trailing newline (`--json`). */
export function formatJson(list: readonly Diagnostic[]): string {
  return `${JSON.stringify(list, null, 2)}\n`;
}
