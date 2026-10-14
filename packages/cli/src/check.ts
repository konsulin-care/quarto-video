// Stages 1–2 for one project (PRD §9.1): run the filter, then validate the
// manifest (IR schema, then component contracts). Shared by `video validate`
// and `video render`, so both reject the same inputs.
import { relative } from "node:path";
import type { IrVideo } from "@quarto-video/ir";
import {
  checkManifest,
  hasErrors,
  type Diagnostic,
} from "@quarto-video/validator";
import { manifestPath, runFilter } from "./filter.js";
import type { Project } from "./project.js";

export type CheckOutcome =
  /** Valid (exit 0 later); `diagnostics` hold warnings only. */
  | { kind: "ok"; ir: IrVideo; diagnostics: Diagnostic[] }
  /** Quarto could not run: a usage or environment problem (exit 2). */
  | { kind: "environment"; message: string }
  /** Rejected; `diagnostics` hold at least one error (exit 1). */
  | { kind: "invalid"; diagnostics: Diagnostic[] };

export function checkProject(project: Project): CheckOutcome {
  const outcome = runFilter(project);
  if (outcome.kind === "environment") {
    return { kind: "environment", message: outcome.message };
  }
  if (outcome.kind === "rejected") {
    return { kind: "invalid", diagnostics: outcome.diagnostics };
  }
  const file = relative(project.root, manifestPath(project));
  const stage2 = checkManifest(outcome.json, file);
  const diagnostics = [...outcome.diagnostics, ...stage2.diagnostics];
  if (stage2.ir === null || hasErrors(stage2.diagnostics)) {
    return { kind: "invalid", diagnostics };
  }
  return { kind: "ok", ir: stage2.ir, diagnostics };
}
