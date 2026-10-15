// Stage 2 animation checks (PRD §5.6; ADR-0011): a scene's animation must be a
// registered preset, and the preset must apply to the scene's component. Pure:
// the presets are passed in. A scene whose component is unknown has no
// contract, so its animation is not checked (E_COMPONENT_UNKNOWN covers it).
import type { IrSceneV11, IrVideoV11 } from "@quarto-video/ir";
import type {
  AnimationPreset,
  ComponentContract,
} from "@quarto-video/registry";
import type { Diagnostic, DiagnosticCode } from "../diagnostic.js";

function problem(
  scene: IrSceneV11,
  code: DiagnosticCode,
  message: string,
  suggestion: string,
): Diagnostic {
  const { file, line } = scene.source;
  return {
    severity: "error",
    code,
    message,
    file,
    ...(line === undefined ? {} : { line }),
    sceneId: scene.id,
    component: scene.component,
    property: "animation",
    suggestion,
  };
}

/** Every animation error in `ir`, scene by scene in document order. */
export function checkAnimations(
  ir: Pick<IrVideoV11, "scenes">,
  components: readonly ComponentContract[],
  presets: readonly AnimationPreset[],
): Diagnostic[] {
  const contracts = new Map(components.map((c) => [c.id, c]));
  const known = new Map(presets.map((p) => [p.id, p]));
  const available = [...known.keys()].sort().join(", ") || "none";
  return ir.scenes.flatMap((scene): Diagnostic[] => {
    const name = scene.animation?.name;
    const contract = contracts.get(scene.component);
    if (name === undefined || contract === undefined) return [];
    const preset = known.get(name);
    if (preset === undefined) {
      return [
        problem(
          scene,
          "E_ANIMATION_UNKNOWN",
          `Unknown animation "${name}" on scene "${scene.id}".`,
          `Known animations: ${available}.`,
        ),
      ];
    }
    const applies =
      contract.compatibleAnimations.includes(name) &&
      preset.compatibleComponents.includes(contract.id);
    if (applies) return [];
    const allowed = contract.compatibleAnimations.join(", ") || "none";
    return [
      problem(
        scene,
        "E_ANIMATION_INCOMPATIBLE",
        `Animation "${name}" does not apply to component "${contract.id}".`,
        `Animations for "${contract.id}": ${allowed}.`,
      ),
    ];
  });
}
