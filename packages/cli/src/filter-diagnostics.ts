// The diagnostics file the filter writes (.video-build/diagnostics.json, see
// _extensions/video/lib/diagnostics.lua), read and checked against the schema.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseDiagnostics, type Diagnostic } from "@quarto-video/validator";
import type { Project } from "./project.js";

const DIAGNOSTICS_RELATIVE = join(".video-build", "diagnostics.json");

/** The diagnostics the filter wrote, or null when the file is missing or invalid. */
export function readFilterDiagnostics(project: Project): Diagnostic[] | null {
  let text: string;
  try {
    text = readFileSync(join(project.root, DIAGNOSTICS_RELATIVE), "utf8");
  } catch {
    return null;
  }
  return parseDiagnostics(text);
}

/** The error reported when the filter fails without usable diagnostics. */
export function filterFailure(document: string, message: string): Diagnostic {
  return {
    severity: "error",
    code: "E_FILTER_FAILED",
    message,
    file: document,
  };
}
