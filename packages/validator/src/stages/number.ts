// Number props (ADR-0015): the authored text of a `number` prop is a decimal
// literal (`42`, `-0.5`, `1e9`); anything else is not a number (E_PROP_TYPE).
// Once the props pass stage 2, each number prop's text becomes a JSON number in
// the resolved manifest; the renderer reads numbers only from validated IR.
import type { IrVideoV02 } from "@quarto-video/ir";
import type { ComponentContract } from "@quarto-video/registry";

/** An optional sign, digits with an optional fraction, an optional exponent. */
const DECIMAL = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;

/**
 * The number a text spells, or null when the text is not a decimal literal.
 * A literal too large for a double is Infinity; the caller rejects it.
 */
export function parseNumberText(text: string): number | null {
  return DECIMAL.test(text) ? Number(text) : null;
}

/** A scene's props as stored: text, or a number from IR 1.5. */
type PropValue = string | number;

/**
 * The manifest with each number prop's text written as a JSON number. A text
 * that is not a finite number stays text; stage 2 has already reported it.
 */
export function withNumbers<T extends Pick<IrVideoV02, "scenes">>(
  ir: T,
  components: readonly ComponentContract[],
): T {
  const known = new Map(components.map((contract) => [contract.id, contract]));
  const scenes = ir.scenes.map((scene) => {
    const contract = known.get(scene.component);
    const given = (scene as { props?: Record<string, PropValue> }).props;
    if (contract === undefined || given === undefined) return scene;
    const props: Record<string, PropValue> = { ...given };
    for (const [name, prop] of Object.entries(contract.props)) {
      const text = given[name];
      if (prop.type !== "number" || typeof text !== "string") continue;
      const value = parseNumberText(text);
      if (value !== null && Number.isFinite(value)) props[name] = value;
    }
    return { ...scene, props };
  });
  return { ...ir, scenes } as unknown as T;
}
