// IR 1.5 (ADR-0015): IR 1.4 plus scene prop values that are numbers, written
// by the validator from a number prop. Text props still validate, a 1.4
// manifest still rejects a number (ir-1.4.json is frozen), and a prop value
// that is neither text nor a number is rejected.
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

/** A fresh copy of `file` with `edit` applied to the scene at `index`. */
function withScene(
  file: string,
  index: number,
  edit: (scene: Doc) => void,
): unknown {
  const doc = load(file);
  const scenes = doc["scenes"] as Doc[];
  edit(scenes[index] as Doc);
  return doc;
}

function errorPaths(json: unknown): string[] {
  const result = validateIr(json);
  return result.ok ? [] : result.errors.map((e) => e.path);
}

describe("IR 1.5 number props", () => {
  it("accepts examples/v1.5.json, a statistic scene with number props", () => {
    expect(validateIr(load("v1.5.json"))).toEqual({ ok: true, errors: [] });
    expect(hasTimeline(load("v1.5.json") as unknown as IrVideo)).toBe(true);
  });

  it("accepts a number, a decimal, and a text prop in one scene", () => {
    const json = withScene("v1.5.json", 3, (scene) => {
      scene["props"] = { value: -0.5, decimals: 2, prefix: "$" };
    });
    expect(validateIr(json)).toEqual({ ok: true, errors: [] });
  });

  it("rejects a prop value that is a boolean", () => {
    const json = withScene("v1.5.json", 3, (scene) => {
      scene["props"] = { value: true };
    });
    expect([...new Set(errorPaths(json))]).toEqual(["/scenes/3/props/value"]);
  });

  it("rejects a prop value that is an object", () => {
    const json = withScene("v1.5.json", 3, (scene) => {
      scene["props"] = { value: { amount: 1 } };
    });
    expect([...new Set(errorPaths(json))]).toEqual(["/scenes/3/props/value"]);
  });

  it("rejects a number in a 1.4 manifest (ir-1.4.json is frozen)", () => {
    const json = withScene("v1.4.json", 2, (scene) => {
      scene["props"] = { value: 1000000000 };
    });
    expect(errorPaths(json)).toEqual(["/scenes/2/props/value"]);
  });
});
