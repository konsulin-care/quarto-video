// Stages 1–2 for one project (PRD §9.1): run the filter, then validate the IR.
// Shared by `video validate` and `video render`, so both reject the same inputs.
import { relative } from "node:path";
import { validateIr, type IrError, type IrVideo } from "@quarto-video/ir";
import type { Diagnostic } from "@quarto-video/validator";
import { manifestPath, runFilter } from "./filter.js";
import type { Project } from "./project.js";

export type CheckOutcome =
  /** Valid (exit 0 later); `diagnostics` hold warnings only. */
  | { kind: "ok"; ir: IrVideo; diagnostics: Diagnostic[] }
  /** Quarto could not run: a usage or environment problem (exit 2). */
  | { kind: "environment"; message: string }
  /** Rejected; `diagnostics` hold at least one error (exit 1). */
  | { kind: "invalid"; diagnostics: Diagnostic[] };

/** One IR schema error, as an E_IR_SCHEMA diagnostic about the manifest file. */
function irDiagnostic(error: IrError, file: string): Diagnostic {
  const where = error.path === "" ? "(root)" : error.path;
  return {
    severity: "error",
    code: "E_IR_SCHEMA",
    message: `${where}: ${error.message}`,
    file,
    ...(error.path === "" ? {} : { property: error.path }),
  };
}

export function checkProject(project: Project): CheckOutcome {
  const outcome = runFilter(project);
  if (outcome.kind === "environment") {
    return { kind: "environment", message: outcome.message };
  }
  if (outcome.kind === "rejected") {
    return { kind: "invalid", diagnostics: outcome.diagnostics };
  }
  const result = validateIr(outcome.json);
  if (!result.ok) {
    const file = relative(project.root, manifestPath(project));
    const ir = result.errors.map((error) => irDiagnostic(error, file));
    return {
      kind: "invalid",
      diagnostics: [...outcome.diagnostics, ...ir],
    };
  }
  return {
    kind: "ok",
    ir: outcome.json as IrVideo,
    diagnostics: outcome.diagnostics,
  };
}
