// Stage 2 animation checks (PRD §5.6; ADR-0011, ADR-0020): a scene's animation
// (entrance) and its exit must each be a registered preset of their role, and
// the preset must apply to the scene's component. Pure: the presets are passed
// in. A scene whose component is unknown has no contract, so its motion is not
// checked (E_COMPONENT_UNKNOWN covers it). The window (animationDuration) is
// checked by stages/windows.ts.
import type { IrSceneV112, IrVideoV112 } from "@quarto-video/ir";
import type {
  AnimationPreset,
  ComponentContract,
} from "@quarto-video/registry";
import type { Diagnostic, DiagnosticCode } from "../diagnostic.js";

/** The two scene attributes that name a preset. */
export type MotionAttribute = "animation" | "exit";

/** The role a preset needs for each attribute (registry `role`). */
const ROLE: Readonly<Record<MotionAttribute, AnimationPreset["role"]>> = {
  animation: "entrance",
  exit: "exit",
};

/** The wording of each attribute in messages. */
const LABEL: Readonly<
  Record<MotionAttribute, { noun: string; known: string }>
> = {
  animation: { noun: "animation", known: "Known animations" },
  exit: { noun: "exit", known: "Known exits" },
};

/** A diagnostic for `scene`, located at its source line. */
export function sceneProblem(
  scene: IrSceneV112,
  code: DiagnosticCode,
  message: string,
  suggestion: string,
  property: string,
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
    property,
    suggestion,
  };
}

/** The first problem with preset `name` on `attribute`, if any. */
function checkName(
  scene: IrSceneV112,
  attribute: MotionAttribute,
  name: string,
  contract: ComponentContract,
  known: ReadonlyMap<string, AnimationPreset>,
): Diagnostic | undefined {
  const { noun, known: knownLabel } = LABEL[attribute];
  const preset = known.get(name);
  const knownOfRole = [...known.values()]
    .filter((p) => p.role === ROLE[attribute])
    .map((p) => p.id)
    .sort()
    .join(", ");
  if (preset === undefined) {
    return sceneProblem(
      scene,
      "E_ANIMATION_UNKNOWN",
      `Unknown ${noun} "${name}" on scene "${scene.id}".`,
      `${knownLabel}: ${knownOfRole || "none"}.`,
      attribute,
    );
  }
  if (preset.role !== ROLE[attribute]) {
    const other: MotionAttribute =
      preset.role === "exit" ? "exit" : "animation";
    return sceneProblem(
      scene,
      "E_ANIMATION_UNKNOWN",
      `Scene "${scene.id}" uses "${name}" as ${noun}, but it is ${preset.role === "exit" ? "an exit" : "an entrance"} preset.`,
      `Use ${other}="${name}" instead.`,
      attribute,
    );
  }
  const applies =
    contract.compatibleAnimations.includes(name) &&
    preset.compatibleComponents.includes(contract.id);
  if (applies) return undefined;
  const allowed = contract.compatibleAnimations
    .filter((id) => known.get(id)?.role === ROLE[attribute])
    .join(", ");
  return sceneProblem(
    scene,
    "E_ANIMATION_INCOMPATIBLE",
    `${noun[0]?.toUpperCase()}${noun.slice(1)} "${name}" does not apply to component "${contract.id}".`,
    `${noun === "exit" ? "Exits" : "Animations"} for "${contract.id}": ${allowed || "none"}.`,
    attribute,
  );
}

/** Every animation and exit error in `ir`, scene by scene in document order. */
export function checkAnimations(
  ir: Pick<IrVideoV112, "scenes">,
  components: readonly ComponentContract[],
  presets: readonly AnimationPreset[],
): Diagnostic[] {
  const contracts = new Map(components.map((c) => [c.id, c]));
  const known = new Map(presets.map((p) => [p.id, p]));
  return ir.scenes.flatMap((scene): Diagnostic[] => {
    const contract = contracts.get(scene.component);
    if (contract === undefined) return [];
    const names: [MotionAttribute, string | undefined][] = [
      ["animation", scene.animation?.name],
      ["exit", scene.exit?.name],
    ];
    return names.flatMap(([attribute, name]) => {
      if (name === undefined) return [];
      const found = checkName(scene, attribute, name, contract, known);
      return found === undefined ? [] : [found];
    });
  });
}
