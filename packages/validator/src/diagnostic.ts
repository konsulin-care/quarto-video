// The diagnostic shape shared by the filter, validator and CLI (PRD §9.2).
// Codes are stable: never reused, and each one is listed in
// packages/validator/README.md. The filter writes the same shape as JSON
// (_extensions/video/lib/diagnostics.lua).

/** Every code the tools emit. A code is added here and to the README table. */
export const DIAGNOSTIC_CODES = [
  "E_SETTING_INVALID",
  "E_CONFIG_UNKNOWN_KEY",
  "E_SCENE_NO_COMPONENT",
  "E_SCENE_NO_DURATION",
  "E_SCENE_NESTED",
  "E_SCENE_SHAPE",
  "E_SCENE_ID_INVALID",
  "E_SCENE_DUPLICATE_ID",
  "E_DURATION_SYNTAX",
  "E_DURATION_RANGE",
  "E_CONTENT_UNSUPPORTED",
  "E_IMAGE_BLOCK",
  "E_IR_SCHEMA",
  "E_IR_UNSUPPORTED_VERSION",
  "E_COMPONENT_UNKNOWN",
  "E_SLOT_UNKNOWN",
  "E_SLOT_REQUIRED",
  "E_SLOT_BLOCK_KIND",
  "E_SLOT_CONSTRAINT",
  "E_PROP_REQUIRED",
  "E_PROP_VALUE",
  "E_PROP_TYPE",
  "E_DURATION_BOUNDS",
  "E_ANIMATION_UNKNOWN",
  "E_ANIMATION_INCOMPATIBLE",
  "E_THEME_UNKNOWN",
  "E_TRANSITION_UNKNOWN",
  "E_TRANSITION_DURATION",
  "E_TRANSITION_FIRST_SCENE",
  "E_TRANSITION_TOO_LONG",
  "E_TRANSITION_OVERLAP",
  "E_TIMELINE_MISMATCH",
  "E_ASSET_MISSING",
  "E_ASSET_ABSOLUTE",
  "E_ASSET_ESCAPE",
  "E_ASSET_SYMLINK",
  "E_ASSET_URL",
  "E_ASSET_INVALID",
  "E_MEDIA_FORMAT",
  "E_MEDIA_UNREADABLE",
  "E_CSV_SYNTAX",
  "E_CSV_VALUE",
  "E_COLUMN_UNKNOWN",
  "E_OUTPUT_MISSING",
  "E_OUTPUT_UNREADABLE",
  "E_OUTPUT_MISMATCH",
  "E_FILTER_FAILED",
  "W_SLOT_TOO_MANY_BLOCKS",
  "W_TEXT_FIT",
  "W_ANIMATION_FALLBACK",
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
  /** Line in `file` (1-based) of the scene or block the problem is about. */
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
