// Stage 2 prop checks (task 035, ADR-0014; number props ADR-0015): each scene's
// props against its component contract. An attribute the contract does not
// declare is E_SCENE_SHAPE (the same code as an unknown scene attribute). A
// required prop that is missing is one error each. A value the prop's type does
// not allow is E_PROP_VALUE; a number prop whose text is not a number is
// E_PROP_TYPE. CSV and column values are checked in stage 3 (stages/data.ts).
import type { IrSceneV02, IrVideoV02 } from "@quarto-video/ir";
import type { ComponentContract } from "@quarto-video/registry";
import type { Diagnostic } from "../diagnostic.js";
import { problem } from "./contract.js";
import { parseNumberText } from "./number.js";

type Prop = ComponentContract["props"][string];

/** A prop as stored: text, or a number (IR 1.5, ADR-0015). */
type PropValue = string | number;

/** The props a scene carries (IR 1.4; numbers from IR 1.5); none for a scene without them. */
export function propsOf(scene: IrSceneV02): Record<string, PropValue> {
  const withProps = scene as IrSceneV02 & { props?: Record<string, PropValue> };
  return withProps.props ?? {};
}

/** The text props of a scene (CSV and column props are text, ADR-0014). */
export function textPropsOf(scene: IrSceneV02): Record<string, string> {
  const text: Record<string, string> = {};
  for (const [name, value] of Object.entries(propsOf(scene))) {
    if (typeof value === "string") text[name] = value;
  }
  return text;
}

/** A rule a value breaks: the code, and why it is not allowed. */
interface Violation {
  code: "E_PROP_VALUE" | "E_PROP_TYPE";
  why: string;
  suggestion: string;
}

/** Why a text value is not allowed for a prop of this type, or null when it is. */
function textViolation(prop: Prop, value: string): Violation | null {
  const accepted = `Accepted: ${acceptedOf(prop)}.`;
  if (value.trim() === "") {
    return {
      code: "E_PROP_VALUE",
      why: "must not be empty",
      suggestion: accepted,
    };
  }
  switch (prop.type) {
    case "enum":
      return (prop.enum ?? []).includes(value)
        ? null
        : {
            code: "E_PROP_VALUE",
            why: `must be one of ${(prop.enum ?? []).join(", ")}`,
            suggestion: accepted,
          };
    case "boolean":
      return value === "true" || value === "false"
        ? null
        : {
            code: "E_PROP_VALUE",
            why: 'must be "true" or "false"',
            suggestion: accepted,
          };
    case "csv":
      return value.toLowerCase().endsWith(".csv")
        ? null
        : {
            code: "E_PROP_VALUE",
            why: "must be a path to a .csv file",
            suggestion: accepted,
          };
    case "string":
    case "column":
      return null;
    case "number":
      return numberViolation(prop, value);
  }
}

/**
 * Why a number prop's value is not allowed (ADR-0015): text that is not a
 * decimal literal is a type error; a finite number outside the bounds, or not
 * a whole number where `integer` is set, is a value error. A JSON number is
 * already a number, so only its bounds are checked.
 */
function numberViolation(prop: Prop, value: PropValue): Violation | null {
  const accepted = `Accepted: ${acceptedOf(prop)}.`;
  if (typeof value === "string" && value.trim() === "") {
    return {
      code: "E_PROP_VALUE",
      why: "must not be empty",
      suggestion: accepted,
    };
  }
  const number = typeof value === "number" ? value : parseNumberText(value);
  if (number === null) {
    return {
      code: "E_PROP_TYPE",
      why: "must be a number",
      suggestion: "Write a number with no separators, such as 42, -0.5 or 1e9.",
    };
  }
  if (!Number.isFinite(number)) {
    return {
      code: "E_PROP_VALUE",
      why: "must be a finite number",
      suggestion: accepted,
    };
  }
  if (prop.integer === true && !Number.isInteger(number)) {
    return {
      code: "E_PROP_VALUE",
      why: "must be a whole number",
      suggestion: accepted,
    };
  }
  if (prop.min !== undefined && number < prop.min) {
    return {
      code: "E_PROP_VALUE",
      why: `must be at least ${prop.min}`,
      suggestion: accepted,
    };
  }
  if (prop.max !== undefined && number > prop.max) {
    return {
      code: "E_PROP_VALUE",
      why: `must be at most ${prop.max}`,
      suggestion: accepted,
    };
  }
  return null;
}

/** The accepted values of a prop, for a suggestion. */
function acceptedOf(prop: Prop): string {
  if (prop.type === "enum") return (prop.enum ?? []).join(", ");
  if (prop.type === "csv") return "a project path ending in .csv";
  if (prop.type === "number") {
    const kind = prop.integer === true ? "a whole number" : "a number";
    const bounds = [
      prop.min === undefined ? "" : `at least ${prop.min}`,
      prop.max === undefined ? "" : `at most ${prop.max}`,
    ].filter((part) => part !== "");
    return bounds.length === 0 ? kind : `${kind}, ${bounds.join(" and ")}`;
  }
  return "text";
}

/** Attributes of a scene that are not props (read by the filter, ADR-0014). */
const SCENE_ATTRIBUTES = [
  "component",
  "duration",
  "transition",
  "transitionDuration",
  "animation",
  "exit",
  "animationDuration",
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

/** The violation of a value of a prop, if any. A JSON number in a text prop is a type error. */
function violationOf(prop: Prop, value: PropValue): Violation | null {
  if (prop.type === "number") return numberViolation(prop, value);
  if (typeof value === "number") {
    return {
      code: "E_PROP_TYPE",
      why: "must be text, not a number",
      suggestion: `Accepted: ${acceptedOf(prop)}.`,
    };
  }
  return textViolation(prop, value);
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
    const value = given[name];
    if (value === undefined) {
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
    const broken = violationOf(prop, value);
    if (broken !== null) {
      found.push(
        problem(
          scene,
          broken.code,
          `Prop "${name}" of component "${contract.id}" is "${value}"; it ${broken.why}.`,
          `props.${name}`,
          broken.suggestion,
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
