// Number props (task 031, ADR-0015): the decimal literals a number prop accepts,
// E_PROP_TYPE for text that is not a number, E_PROP_VALUE for bounds and
// whole numbers, and the JSON numbers the resolved manifest carries.
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "@quarto-video/registry";
import { checkProps } from "../src/stages/props.js";
import { parseNumberText, withNumbers } from "../src/stages/number.js";

const CONTRACT = {
  id: "sample-number",
  props: {
    value: { type: "number", required: true, min: -1e15, max: 1e15 },
    decimals: { type: "number", integer: true, min: 0, max: 6 },
    unit: { type: "string" },
  },
} as unknown as ComponentContract;

type Scene = {
  id: string;
  component: string;
  props: Record<string, string | number>;
  source: { file: string; line: number };
};

/** The codes of one scene's props, checked against CONTRACT. */
function codesFor(props: Record<string, string | number>): string[] {
  const scene: Scene = {
    id: "scene-001",
    component: "sample-number",
    props,
    source: { file: "index.qmd", line: 7 },
  };
  return checkProps({ scenes: [scene as never] }, [CONTRACT]).map(
    (d) => d.code,
  );
}

describe("number props: text", () => {
  it.each(["42", "-0.5", "+3", ".5", "1e9", "2.5E-3", "1000000000"])(
    "accepts %s as a number",
    (text) => {
      expect(codesFor({ value: text })).toEqual([]);
    },
  );

  it.each(["abc", "1,000", "NaN", "Infinity", "1_000", "12px", "0x1F"])(
    "rejects %s with E_PROP_TYPE",
    (text) => {
      expect(codesFor({ value: text })).toEqual(["E_PROP_TYPE"]);
    },
  );

  it("names the prop, the text and the line in the E_PROP_TYPE message", () => {
    const scene: Scene = {
      id: "scene-001",
      component: "sample-number",
      props: { value: "abc" },
      source: { file: "index.qmd", line: 7 },
    };
    const [found] = checkProps({ scenes: [scene as never] }, [CONTRACT]);
    expect(found?.message).toBe(
      'Prop "value" of component "sample-number" is "abc"; it must be a number.',
    );
    expect(found?.property).toBe("props.value");
    expect(found?.line).toBe(7);
  });

  it("reports an empty number as E_PROP_VALUE, not a type error", () => {
    expect(codesFor({ value: "" })).toEqual(["E_PROP_VALUE"]);
  });

  it("reports a literal too large for a double as E_PROP_VALUE", () => {
    expect(codesFor({ value: "1e400" })).toEqual(["E_PROP_VALUE"]);
  });
});

describe("number props: bounds and whole numbers", () => {
  it("rejects a value above max", () => {
    expect(codesFor({ value: "1e16" })).toEqual(["E_PROP_VALUE"]);
  });

  it("rejects a value below min on a prop with min", () => {
    expect(codesFor({ value: "1", decimals: "-1" })).toEqual(["E_PROP_VALUE"]);
  });

  it("rejects a decimal where the prop is an integer", () => {
    expect(codesFor({ value: "1", decimals: "2.5" })).toEqual(["E_PROP_VALUE"]);
  });

  it("accepts a whole number at the bounds", () => {
    expect(codesFor({ value: "1", decimals: "0" })).toEqual([]);
    expect(codesFor({ value: "1", decimals: "6" })).toEqual([]);
  });

  it("names the bound in the message", () => {
    const scene: Scene = {
      id: "scene-001",
      component: "sample-number",
      props: { value: "1", decimals: "9" },
      source: { file: "index.qmd", line: 3 },
    };
    const [found] = checkProps({ scenes: [scene as never] }, [CONTRACT]);
    expect(found?.message).toContain("must be at most 6");
    expect(found?.suggestion).toBe(
      "Accepted: a whole number, at least 0 and at most 6.",
    );
  });
});

describe("number props: JSON numbers", () => {
  it("accepts a JSON number in a number prop, within bounds", () => {
    expect(codesFor({ value: 1000000000 })).toEqual([]);
  });

  it("rejects a JSON number in a text prop as E_PROP_TYPE", () => {
    expect(codesFor({ value: "1", unit: 5 })).toEqual(["E_PROP_TYPE"]);
  });

  it("parses decimal literals only", () => {
    expect(parseNumberText("1e9")).toBe(1000000000);
    expect(parseNumberText("-0.5")).toBe(-0.5);
    expect(parseNumberText("1,000")).toBeNull();
    expect(parseNumberText("")).toBeNull();
  });
});

describe("withNumbers", () => {
  it("writes each number prop as a JSON number and keeps text props", () => {
    const ir = {
      scenes: [
        {
          id: "scene-001",
          component: "sample-number",
          props: { value: "1e9", decimals: "0", unit: "42" },
        },
      ],
    };
    const out = withNumbers(ir as never, [CONTRACT]) as unknown as typeof ir;
    expect(out.scenes[0]?.props).toEqual({
      value: 1000000000,
      decimals: 0,
      unit: "42",
    });
  });

  it("leaves the input manifest unchanged", () => {
    const ir = {
      scenes: [
        { id: "scene-001", component: "sample-number", props: { value: "2" } },
      ],
    };
    withNumbers(ir as never, [CONTRACT]);
    expect(ir.scenes[0]?.props.value).toBe("2");
  });

  it("keeps a scene without props as it is", () => {
    const ir = { scenes: [{ id: "scene-001", component: "sample-number" }] };
    expect(withNumbers(ir as never, [CONTRACT])).toEqual(ir);
  });
});
