// Stage 2 prop checks (task 035, ADR-0014): unknown attributes, missing
// required props and invalid values, against the shipped chart contract.
import { describe, expect, it } from "vitest";
import { getComponent, listComponents } from "@quarto-video/registry";
import { checkProps } from "../src/stages/props.js";

type Scene = {
  id: string;
  component: string;
  props?: Record<string, string>;
  source: { file: string; line?: number };
};

const CHART_OK = {
  type: "bar",
  data: "data/sales.csv",
  x: "region",
  y: "sales",
  unit: "kEUR",
  title: "Sales",
};

function scene(
  props: Record<string, string> | undefined,
  component = "chart",
): Scene {
  return {
    id: "scene-001",
    component,
    ...(props === undefined ? {} : { props }),
    source: { file: "index.qmd", line: 4 },
  };
}

function codesOf(s: Scene): string[] {
  return checkProps({ scenes: [s as never] }, listComponents()).map(
    (d) => d.code,
  );
}

describe("checkProps: the chart contract", () => {
  it("accepts a scene with every chart prop", () => {
    expect(codesOf(scene(CHART_OK))).toEqual([]);
  });

  it("reports a missing required prop, naming it", () => {
    const rest: Record<string, string> = { ...CHART_OK };
    delete rest["unit"];
    const [diagnostic] = checkProps(
      { scenes: [scene(rest) as never] },
      listComponents(),
    );
    expect(diagnostic?.code).toBe("E_PROP_REQUIRED");
    expect(diagnostic?.message).toBe(
      'Component "chart" needs the prop "unit".',
    );
    expect(diagnostic?.property).toBe("props.unit");
    expect(diagnostic?.line).toBe(4);
  });

  it("reports an attribute the contract does not declare as E_SCENE_SHAPE", () => {
    const [diagnostic] = checkProps(
      { scenes: [scene({ ...CHART_OK, colour: "red" }) as never] },
      listComponents(),
    );
    expect(diagnostic?.code).toBe("E_SCENE_SHAPE");
    expect(diagnostic?.property).toBe("props.colour");
    expect(diagnostic?.suggestion).toMatch(
      /Props of "chart": data, title, type, unit, x, y\./,
    );
  });

  it("says a component with no props has none", () => {
    const [diagnostic] = checkProps(
      { scenes: [scene({ size: "big" }, "title") as never] },
      listComponents(),
    );
    expect(diagnostic?.code).toBe("E_SCENE_SHAPE");
    expect(diagnostic?.suggestion).toMatch(/Component "title" has no props\./);
  });

  it("rejects an enum value outside its list, listing the accepted ones", () => {
    const [diagnostic] = checkProps(
      { scenes: [scene({ ...CHART_OK, type: "pie" }) as never] },
      listComponents(),
    );
    expect(diagnostic?.code).toBe("E_PROP_VALUE");
    expect(diagnostic?.message).toBe(
      'Prop "type" of component "chart" is "pie"; it must be one of bar, line.',
    );
  });

  it("rejects an empty required string", () => {
    expect(codesOf(scene({ ...CHART_OK, title: "  " }))).toEqual([
      "E_PROP_VALUE",
    ]);
  });

  it("rejects a csv prop that is not a .csv path", () => {
    expect(codesOf(scene({ ...CHART_OK, data: "data/sales.txt" }))).toEqual([
      "E_PROP_VALUE",
    ]);
  });

  it("accepts a .csv path in upper case", () => {
    expect(codesOf(scene({ ...CHART_OK, data: "data/SALES.CSV" }))).toEqual([]);
  });

  it("does not check a scene whose component is unknown (stage 2 reports it)", () => {
    expect(codesOf(scene({ colour: "red" }, "mystery"))).toEqual([]);
  });

  it("reports each bad prop once: the value in contract order, then the missing ones", () => {
    const second = { ...scene(CHART_OK), id: "scene-002" };
    const list = checkProps(
      { scenes: [scene({ type: "pie" }) as never, second as never] },
      listComponents(),
    );
    expect(list.map((d) => [d.sceneId, d.code])).toEqual([
      ["scene-001", "E_PROP_VALUE"],
      ["scene-001", "E_PROP_REQUIRED"],
      ["scene-001", "E_PROP_REQUIRED"],
      ["scene-001", "E_PROP_REQUIRED"],
      ["scene-001", "E_PROP_REQUIRED"],
      ["scene-001", "E_PROP_REQUIRED"],
    ]);
  });

  it("the shipped chart contract declares csv and column props with the expected types", () => {
    const chart = getComponent("chart");
    expect(chart.props["x"]?.of).toBe("data");
    expect(chart.props["y"]?.numeric).toBe(true);
    expect(chart.props["data"]?.type).toBe("csv");
  });
});
