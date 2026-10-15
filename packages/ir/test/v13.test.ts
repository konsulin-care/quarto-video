// IR 1.3 (ADR-0013): IR 1.2 plus optional scene `props` (authored attribute
// strings) and `tables` (CSV data, written by the validator). Every 1.2 rule
// still holds; a scene may have no slots, so the contract decides which are
// required.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hasTimeline } from "../src/timeline.js";
import { validateIr } from "../src/validate.js";
import type { IrVideo } from "../src/types.js";

type Doc = Record<string, unknown>;

const load = (file: string): Doc =>
  JSON.parse(
    readFileSync(new URL(`../examples/${file}`, import.meta.url), "utf8"),
  );

/** A fresh copy of examples/v1.3.json with `edit` applied to its chart scene. */
function withChart(edit: (scene: Doc) => void): unknown {
  const doc = load("v1.3.json");
  const scenes = doc["scenes"] as Doc[];
  edit(scenes[2] as Doc);
  return doc;
}

function errorPaths(json: unknown): string[] {
  const result = validateIr(json);
  return result.ok ? [] : result.errors.map((e) => e.path);
}

describe("IR 1.3 props and tables", () => {
  it("accepts examples/v1.3.json, a chart scene with props and a table", () => {
    expect(validateIr(load("v1.3.json"))).toEqual({ ok: true, errors: [] });
    expect(hasTimeline(load("v1.3.json") as unknown as IrVideo)).toBe(true);
  });

  it("accepts a scene with no slots when it has props", () => {
    const json = withChart((scene) => (scene["content"] = { slots: {} }));
    expect(validateIr(json)).toEqual({ ok: true, errors: [] });
  });

  it("accepts a scene without props or tables (absent keys)", () => {
    const json = withChart((scene) => {
      delete scene["props"];
      delete scene["tables"];
    });
    expect(validateIr(json)).toEqual({ ok: true, errors: [] });
  });

  it("rejects a prop value that is not a string", () => {
    const json = withChart((scene) => (scene["props"] = { type: 3 }));
    expect(errorPaths(json)).toEqual(["/scenes/2/props/type"]);
  });

  it("rejects a prop name that is not camelCase", () => {
    const json = withChart((scene) => (scene["props"] = { "Bad-Name": "x" }));
    const paths = errorPaths(json);
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.every((path) => path === "/scenes/2/props")).toBe(true);
  });

  it("rejects a table row that is not a list of strings", () => {
    const json = withChart(
      (scene) =>
        (scene["tables"] = {
          data: { columns: ["a"], rows: [[1]] },
        }),
    );
    expect(errorPaths(json)).toEqual(["/scenes/2/tables/data/rows/0/0"]);
  });

  it("rejects props on a 1.2 manifest (1.2 is frozen)", () => {
    const doc = load("v1.2.json");
    const scenes = doc["scenes"] as Doc[];
    scenes[0] = { ...(scenes[0] as Doc), props: { type: "bar" } };
    expect(errorPaths(doc)).toEqual(["/scenes/0/props"]);
  });
});
