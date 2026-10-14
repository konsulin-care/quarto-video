// Stages 1–2 for one project (PRD §9.1): run the filter, then validate the IR.
// Shared by `video validate` and `video render`, so both reject the same inputs.
import type { IrVideo } from "@quarto-video/ir";
import { validateIr } from "@quarto-video/ir";
import { runFilter } from "./filter.js";
import type { Project } from "./project.js";

export type CheckOutcome =
  | { kind: "ok"; ir: IrVideo }
  /** Quarto could not run: a usage or environment problem (exit 2). */
  | { kind: "environment"; message: string }
  /** The filter or the IR validator rejected the input; `lines` go to stderr (exit 1). */
  | { kind: "invalid"; lines: string[] };

export function checkProject(project: Project): CheckOutcome {
  const outcome = runFilter(project);
  if (outcome.kind === "environment") {
    return { kind: "environment", message: outcome.message };
  }
  if (outcome.kind === "rejected") {
    return { kind: "invalid", lines: [outcome.message] };
  }
  const result = validateIr(outcome.json);
  if (!result.ok) {
    const lines = result.errors.map(
      (error) => `${error.path || "(root)"}: ${error.message}`,
    );
    return { kind: "invalid", lines };
  }
  return { kind: "ok", ir: outcome.json as IrVideo };
}
