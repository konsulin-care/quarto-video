// The stage runner for a parsed manifest (PRD §9.1). Stage 2 is the IR schema,
// then the component contracts. A stage that reports an error stops the run:
// later stages never see a manifest that is not valid yet. Stage 1 (the Lua
// filter) and stage 5 (preflight) run in the CLI.
import {
  validateIr,
  type IrError,
  type IrVideo,
  type IrVideoV02,
} from "@quarto-video/ir";
import { listComponents, type ComponentContract } from "@quarto-video/registry";
import { hasErrors, type Diagnostic } from "./diagnostic.js";
import { checkContracts } from "./stages/contract.js";

export interface ManifestCheck {
  /** The manifest when it passed every stage; null when any stage failed. */
  ir: IrVideo | null;
  diagnostics: Diagnostic[];
}

/** Runs each stage in order and stops after the first one that reports an error. */
export function runStages(
  stages: ReadonlyArray<() => Diagnostic[]>,
): Diagnostic[] {
  const all: Diagnostic[] = [];
  for (const stage of stages) {
    const found = stage();
    all.push(...found);
    if (hasErrors(found)) break;
  }
  return all;
}

/** One IR schema error, as an E_IR_SCHEMA diagnostic about `file`. */
export function schemaDiagnostic(error: IrError, file: string): Diagnostic {
  const where = error.path === "" ? "(root)" : error.path;
  return {
    severity: "error",
    code: "E_IR_SCHEMA",
    message: `${where}: ${error.message}`,
    file,
    ...(error.path === "" ? {} : { property: error.path }),
  };
}

/**
 * Stage 2 for the manifest the filter wrote (`file`, project-relative).
 * Contracts read the slots of IR 0.2 (ADR-0004); a 0.1 manifest is an error.
 */
export function checkManifest(
  json: unknown,
  file: string,
  components: readonly ComponentContract[] = listComponents(),
): ManifestCheck {
  const state: { ir?: IrVideoV02 } = {};
  const diagnostics = runStages([
    () => {
      const result = validateIr(json);
      if (!result.ok) {
        return result.errors.map((error) => schemaDiagnostic(error, file));
      }
      const ir = json as IrVideo;
      if (ir.schemaVersion !== "0.2") {
        return [
          schemaDiagnostic(
            {
              path: "/schemaVersion",
              message: `must be "0.2" for component contracts (scene slots); got "${ir.schemaVersion}"`,
            },
            file,
          ),
        ];
      }
      state.ir = ir;
      return [];
    },
    () => {
      const ir = state.ir;
      return ir === undefined ? [] : checkContracts(ir, components);
    },
  ]);
  return {
    ir: hasErrors(diagnostics) ? null : (state.ir ?? null),
    diagnostics,
  };
}
