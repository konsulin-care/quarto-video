// The stage runner for a parsed manifest (PRD §9.1). Stage 2 is the IR schema,
// then the component contracts; stage 3 is the asset references (ADR-0006);
// stage 4 is the timeline. A stage that reports an error stops the run: later
// stages never see a manifest that is not valid yet. Stage 1 (the Lua filter)
// and stage 5 (preflight) run in the CLI.
import {
  validateIr,
  type IrError,
  type IrVideo,
  type IrVideoV02,
  type IrVideoWithTimeline,
} from "@quarto-video/ir";
import {
  listAnimations,
  listComponents,
  listTransitionPresets,
  type AnimationPreset,
  type ComponentContract,
  type TransitionPreset,
} from "@quarto-video/registry";
import { hasErrors, type Diagnostic } from "./diagnostic.js";
import { checkAnimations } from "./stages/animation.js";
import { checkKinetic } from "./stages/kinetic.js";
import {
  assetRefsOf,
  checkAssets,
  type AssetRef,
  type MediaOptions,
} from "./stages/assets.js";
import { checkContracts } from "./stages/contract.js";
import { resolveData } from "./stages/data.js";
import { withNumbers } from "./stages/number.js";
import { checkProps } from "./stages/props.js";
import { checkTimeline } from "./stages/timeline.js";

/**
 * Stage 3 input: the absolute project root the references resolve in, and the
 * references to check. Unset `refs` means the image blocks of the IR (ADR-0013).
 */
export interface AssetCheck {
  root: string;
  refs?: readonly AssetRef[];
  /** Probe and cache for video and audio references (ADR-0008). */
  media?: MediaOptions;
}

export interface ManifestCheck {
  /** The manifest when it passed every stage; null when any stage failed. */
  ir: IrVideo | null;
  diagnostics: Diagnostic[];
}

/**
 * Stable sort by line: the scenes' errors in document order, and the errors of
 * one scene in the order its checks ran. Errors without a line come last.
 */
export function inDocumentOrder(list: readonly Diagnostic[]): Diagnostic[] {
  const at = (d: Diagnostic) => d.line ?? Number.MAX_SAFE_INTEGER;
  return list
    .map((diagnostic, index) => ({ diagnostic, index }))
    .sort((a, b) => at(a.diagnostic) - at(b.diagnostic) || a.index - b.index)
    .map((entry) => entry.diagnostic);
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

/** One IR schema error, as an E_IR_SCHEMA diagnostic (or its own code) about `file`. */
export function schemaDiagnostic(error: IrError, file: string): Diagnostic {
  const where = error.path === "" ? "(root)" : error.path;
  return {
    severity: "error",
    code: error.code ?? "E_IR_SCHEMA",
    message: `${where}: ${error.message}`,
    file,
    ...(error.path === "" ? {} : { property: error.path }),
  };
}

/**
 * Stages 2 to 4 for the manifest the filter wrote (`file`, project-relative).
 * An unsupported version is E_IR_UNSUPPORTED_VERSION (ADR-0007). Contracts read
 * the slots of IR 0.2 or later (ADR-0004); a 0.1 manifest is an error. Stage 2
 * also checks scene animations against `animations` (ADR-0011). Stage 3 checks
 * `assets` when given (ADR-0006). Stage 4 checks transitions and the timeline
 * (ADR-0005; 0.3 and later).
 */
export function checkManifest(
  json: unknown,
  file: string,
  components: readonly ComponentContract[] = listComponents(),
  transitions: readonly TransitionPreset[] = listTransitionPresets(),
  assets?: AssetCheck,
  animations: readonly AnimationPreset[] = listAnimations(),
): ManifestCheck {
  const state: { ir?: IrVideoV02 | IrVideoWithTimeline } = {};
  const diagnostics = runStages([
    () => {
      const result = validateIr(json);
      if (!result.ok) {
        return result.errors.map((error) => schemaDiagnostic(error, file));
      }
      const ir = json as IrVideo;
      if (ir.schemaVersion === "0.1") {
        return [
          schemaDiagnostic(
            {
              path: "/schemaVersion",
              message: `must be "0.2" or newer for component contracts (scene slots); got "${ir.schemaVersion}"`,
            },
            file,
          ),
        ];
      }
      state.ir = ir as IrVideoV02 | IrVideoWithTimeline;
      return [];
    },
    () => {
      const ir = state.ir;
      if (ir === undefined) return [];
      const found = inDocumentOrder([
        ...checkContracts(ir, components),
        ...checkProps(ir, components),
        ...checkAnimations(ir, components, animations),
        ...checkKinetic(ir),
      ]);
      // Number props become JSON numbers (ADR-0015); with errors the run stops here.
      state.ir = withNumbers(ir, components);
      return found;
    },
    () => {
      if (assets === undefined) return [];
      const ir = state.ir;
      // Unset refs: the image blocks of the IR (ADR-0006, ADR-0013).
      const refs = assets.refs ?? (ir === undefined ? [] : assetRefsOf(ir));
      const assetErrors = checkAssets(refs, assets.root, assets.media);
      if (ir === undefined) return assetErrors;
      const data = resolveData(ir, components, assets.root);
      state.ir = data.ir;
      return [...assetErrors, ...data.diagnostics];
    },
    () => {
      const ir = state.ir;
      return ir === undefined ? [] : checkTimeline(ir, transitions);
    },
  ]);
  return {
    ir: hasErrors(diagnostics) ? null : (state.ir ?? null),
    diagnostics,
  };
}
