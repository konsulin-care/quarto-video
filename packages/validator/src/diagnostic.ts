// The diagnostic shape shared by the filter, validator and CLI (PRD §9.2).
// Codes are stable: never reused, and each one is listed in
// packages/validator/README.md. The filter writes the same shape as JSON
// (_extensions/video/lib/diagnostics.lua).

/** Every code the tools emit. A code is added here and to the README table. */
export const DIAGNOSTIC_CODES = [
  "E_SETTING_MISSING",
  "E_SETTING_INVALID",
  "E_SCENE_NO_COMPONENT",
  "E_SCENE_NO_DURATION",
  "E_SCENE_NESTED",
  "E_SCENE_SHAPE",
  "E_DURATION_SYNTAX",
  "E_DURATION_RANGE",
  "E_IR_SCHEMA",
  "E_FILTER_FAILED",
] as const;

export type DiagnosticCode = (typeof DIAGNOSTIC_CODES)[number];

export type Severity = "error" | "warning";

/** One problem found in a project. Only severity, code and message are always set. */
export interface Diagnostic {
  severity: Severity;
  code: DiagnosticCode;
  message: string;
  /** Document or build file, relative to the project root, e.g. `index.qmd`. */
  file?: string;
  /** Line in `file`; optional until line tracking (task 011). */
  line?: number;
  sceneId?: string;
  component?: string;
  /** The invalid property, e.g. `duration` or `video.fps`. */
  property?: string;
  assetPath?: string;
  suggestion?: string;
}

/** True when any diagnostic is an error. Warnings never fail a command. */
export function hasErrors(list: readonly Diagnostic[]): boolean {
  return list.some((diagnostic) => diagnostic.severity === "error");
}
