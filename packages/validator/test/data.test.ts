// Stage 3 data checks (task 035, ADR-0014): CSV props are read from the project
// root, parsed, and their column props checked. Each failure names the CSV file
// and line, or the scene's column prop.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listComponents } from "@quarto-video/registry";
import { resolveData } from "../src/stages/data.js";

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "video-data-"));
  mkdirSync(join(root, "data"));
  writeFileSync(
    join(root, "data", "sales.csv"),
    "region,sales\nNorth,120\nSouth,95.5\n",
  );
  writeFileSync(
    join(root, "data", "text.csv"),
    "region,sales\nNorth,120\nSouth,n/a\n",
  );
  writeFileSync(
    join(root, "data", "broken.csv"),
    "region,sales\nNorth,120,9\n",
  );
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

const PROPS = {
  type: "bar",
  data: "data/sales.csv",
  x: "region",
  y: "sales",
  unit: "kEUR",
  title: "Sales",
};

function ir(props: Record<string, string>) {
  return {
    scenes: [
      {
        id: "scene-001",
        component: "chart",
        durationFrames: 120,
        content: { slots: {} },
        props,
        source: { file: "index.qmd", line: 9 },
      },
    ],
  } as never;
}

describe("resolveData", () => {
  it("attaches the parsed table under the csv prop name", () => {
    const result = resolveData(ir(PROPS), listComponents(), root);
    expect(result.diagnostics).toEqual([]);
    const scene = (result.ir as { scenes: Array<{ tables?: unknown }> })
      .scenes[0];
    expect(scene?.tables).toEqual({
      data: {
        columns: ["region", "sales"],
        rows: [
          ["North", "120"],
          ["South", "95.5"],
        ],
      },
    });
  });

  it("names the available columns when a column prop is unknown", () => {
    const [diagnostic] = resolveData(
      ir({ ...PROPS, y: "revenue" }),
      listComponents(),
      root,
    ).diagnostics;
    expect(diagnostic?.code).toBe("E_COLUMN_UNKNOWN");
    expect(diagnostic?.message).toBe(
      'Column "revenue" is not a column of data/sales.csv. Available columns: region, sales.',
    );
    expect(diagnostic?.property).toBe("props.y");
    expect(diagnostic?.sceneId).toBe("scene-001");
    expect(diagnostic?.line).toBe(9);
  });

  it("names the CSV line of a cell that is not a number", () => {
    const [diagnostic] = resolveData(
      ir({ ...PROPS, data: "data/text.csv" }),
      listComponents(),
      root,
    ).diagnostics;
    expect(diagnostic?.code).toBe("E_CSV_VALUE");
    expect(diagnostic?.file).toBe("data/text.csv");
    expect(diagnostic?.line).toBe(3);
    expect(diagnostic?.message).toBe(
      'Value "n/a" in column "sales" is not a number.',
    );
  });

  it("names the CSV line of a malformed row", () => {
    const [diagnostic] = resolveData(
      ir({ ...PROPS, data: "data/broken.csv" }),
      listComponents(),
      root,
    ).diagnostics;
    expect(diagnostic?.code).toBe("E_CSV_SYNTAX");
    expect(diagnostic?.file).toBe("data/broken.csv");
    expect(diagnostic?.line).toBe(2);
  });

  it("reports a missing CSV file as an asset error, not a crash", () => {
    const [diagnostic] = resolveData(
      ir({ ...PROPS, data: "data/none.csv" }),
      listComponents(),
      root,
    ).diagnostics;
    expect(diagnostic?.code).toBe("E_ASSET_MISSING");
    expect(diagnostic?.assetPath).toBe("data/none.csv");
  });

  it("refuses a CSV outside the project root", () => {
    const [diagnostic] = resolveData(
      ir({ ...PROPS, data: "../outside.csv" }),
      listComponents(),
      root,
    ).diagnostics;
    expect(diagnostic?.code).toBe("E_ASSET_ESCAPE");
  });

  it("leaves the input manifest unchanged", () => {
    const input = ir(PROPS);
    resolveData(input, listComponents(), root);
    expect(input).toEqual(ir(PROPS));
  });
});
