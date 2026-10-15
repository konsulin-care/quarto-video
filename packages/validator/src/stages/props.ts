// Stage 2 prop checks (task 035, ADR-0014): each scene's props against its
// component contract. An attribute the contract does not declare is
// E_SCENE_SHAPE (the same code as an unknown scene attribute). A required prop
// that is missing, or a value the prop's type does not allow, is one error
// each. CSV and column values are checked in stage 3 (stages/data.ts).
import type { IrSceneV02, IrVideoV02 } from "@quarto-video/ir";
import type { ComponentContract } from "@quarto-video/registry";
import type { Diagnostic } from "../diagnostic.js";
import { problem } from "./contract.js";

type Prop = ComponentContract["props"][string];

/** The props a scene carries (IR 1.4); none for older manifests or a scene without them. */
export function propsOf(scene: IrSceneV02): Record<string, string> {
  const withProps = scene as IrSceneV02 & { props?: Record<string, string> };
  return withProps.props ?? {};
}

/** Why `value` is not allowed for a prop of this type, or null when it is. */
function valueProblem(prop: Prop, value: string): string | null {
  if (value.trim() === "") return "must not be empty";
  switch (prop.type) {
    case "enum":
      return (prop.enum ?? []).includes(value)
        ? null
        : `must be one of ${(prop.enum ?? []).join(", ")}`;
    case "boolean":
      return value === "true" || value === "false"
        ? null
        : 'must be "true" or "false"';
    case "csv":
      return value.toLowerCase().endsWith(".csv")
        ? null
        : "must be a path to a .csv file";
    case "string":
    case "column":
      return null;
  }
}

/** The accepted values of a prop, for a suggestion. */
function acceptedOf(prop: Prop): string {
  if (prop.type === "enum") return (prop.enum ?? []).join(", ");
  if (prop.type === "csv") return "a project path ending in .csv";
  return "text";
}

/** Attributes of a scene that are not props (read by the filter, ADR-0014). */
const SCENE_ATTRIBUTES = [
  "component",
  "duration",
  "transition",
  "transitionDuration",
  "animation",
];

function unknownProp(
  scene: IrSceneV02,
  contract: ComponentContract,
  name: string,
): Diagnostic {
  const allowed = Object.keys(contract.props).sort();
  const props =
    allowed.length === 0
      ? `Component "${contract.id}" has no props.`
      : `Props of "${contract.id}": ${allowed.join(", ")}.`;
  return problem(
    scene,
    "E_SCENE_SHAPE",
    `Scene "${scene.id}" has an unknown attribute "${name}" for component "${contract.id}".`,
    `props.${name}`,
    `Scene attributes: ${SCENE_ATTRIBUTES.join(", ")}. ${props}`,
  );
}

function checkScene(
  scene: IrSceneV02,
  contract: ComponentContract,
): Diagnostic[] {
  const given = propsOf(scene);
  const found: Diagnostic[] = [];
  for (const name of Object.keys(given).sort()) {
    if (!Object.hasOwn(contract.props, name)) {
      found.push(unknownProp(scene, contract, name));
    }
  }
  for (const name of Object.keys(contract.props)) {
    const prop = contract.props[name];
    if (prop === undefined) continue;
    if (!Object.hasOwn(given, name)) {
      if (prop.required === true) {
        found.push(
          problem(
            scene,
            "E_PROP_REQUIRED",
            `Component "${contract.id}" needs the prop "${name}".`,
            `props.${name}`,
            `Add ${name}="<value>" to the scene. Accepted: ${acceptedOf(prop)}.`,
          ),
        );
      }
      continue;
    }
    const value = given[name] ?? "";
    const why = valueProblem(prop, value);
    if (why !== null) {
      found.push(
        problem(
          scene,
          "E_PROP_VALUE",
          `Prop "${name}" of component "${contract.id}" is "${value}"; it ${why}.`,
          `props.${name}`,
          `Accepted: ${acceptedOf(prop)}.`,
        ),
      );
    }
  }
  return found;
}

/** Every prop error in `ir`, scene by scene in document order (IR 1.4). */
export function checkProps(
  ir: Pick<IrVideoV02, "scenes">,
  components: readonly ComponentContract[],
): Diagnostic[] {
  const known = new Map(components.map((contract) => [contract.id, contract]));
  return ir.scenes.flatMap((scene): Diagnostic[] => {
    const contract = known.get(scene.component);
    return contract === undefined ? [] : checkScene(scene, contract);
  });
}
