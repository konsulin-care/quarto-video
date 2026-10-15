// Stages 1–2 for one project (PRD §9.1): run the filter, then validate the
// manifest (IR schema, then component contracts) and the theme name. Shared by
// `video validate` and `video render`, so both reject the same inputs.
import { relative } from "node:path";
import type { IrVideo } from "@quarto-video/ir";
import {
  checkManifest,
  checkTextFit,
  checkTheme,
  hasErrors,
  type Diagnostic,
} from "@quarto-video/validator";
import { manifestPath, runFilter } from "./filter.js";
import { themeName } from "./render-config.js";
import type { Project } from "./project.js";

export type CheckOutcome =
  /** Valid (exit 0 later); `diagnostics` hold warnings only; `theme` is the resolved theme id. */
  | { kind: "ok"; ir: IrVideo; theme: string; diagnostics: Diagnostic[] }
  /** Quarto could not run: a usage or environment problem (exit 2). */
  | { kind: "environment"; message: string }
  /** Rejected; `diagnostics` hold at least one error (exit 1). */
  | { kind: "invalid"; diagnostics: Diagnostic[] };

/**
 * Runs stages 1–2. `themeOverride` is the render option (`--theme`); when it is
 * set, the front matter `theme:` is not used (resolution order: option, front
 * matter, the default theme).
 */
export function checkProject(
  project: Project,
  themeOverride: string | null = null,
): CheckOutcome {
  const outcome = runFilter(project);
  if (outcome.kind === "environment") {
    return { kind: "environment", message: outcome.message };
  }
  if (outcome.kind === "rejected") {
    return { kind: "invalid", diagnostics: outcome.diagnostics };
  }
  const file = relative(project.root, manifestPath(project));
  // Stage 3 checks the image files the IR names, inside the project root (ADR-0006).
  const stage2 = checkManifest(outcome.json, file, undefined, undefined, {
    root: project.root,
  });
  const theme = checkTheme(
    themeOverride ?? themeName(project),
    relative(project.root, project.document),
  );
  // Text-fit warnings need the resolved theme and a valid manifest (task 025).
  const fit =
    stage2.ir !== null && theme.theme !== null
      ? checkTextFit(stage2.ir, theme.theme)
      : [];
  const diagnostics = [
    ...outcome.diagnostics,
    ...stage2.diagnostics,
    ...theme.diagnostics,
    ...fit,
  ];
  if (stage2.ir === null || hasErrors(diagnostics) || theme.theme === null) {
    return { kind: "invalid", diagnostics };
  }
  return { kind: "ok", ir: stage2.ir, theme: theme.theme.id, diagnostics };
}
