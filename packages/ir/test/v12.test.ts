// IR 1.2 (ADR-0012): IR 1.1 plus an optional settings.reducedMotion. Every 1.1
// rule still holds; the flag is checked for shape only (the renderer applies it).
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

/** A fresh copy of `file` with `edit` applied to its settings. */
function withSettings(
  edit: (settings: Doc) => void,
  file = "v1.2.json",
): unknown {
  const doc = load(file);
  edit(doc["settings"] as Doc);
  return doc;
}

function errorPaths(json: unknown): string[] {
  const result = validateIr(json);
  return result.ok ? [] : result.errors.map((e) => e.path);
}

describe("IR 1.2 reduced motion", () => {
  it("accepts examples/v1.2.json, which sets reducedMotion true", () => {
    expect(validateIr(load("v1.2.json"))).toEqual({ ok: true, errors: [] });
    expect((load("v1.2.json")["settings"] as Doc)["reducedMotion"]).toBe(true);
  });

  it("accepts settings without reducedMotion (absent means false)", () => {
    const json = withSettings((settings) => delete settings["reducedMotion"]);
    expect(validateIr(json)).toEqual({ ok: true, errors: [] });
  });

  it("accepts reducedMotion false", () => {
    const json = withSettings(
      (settings) => (settings["reducedMotion"] = false),
    );
    expect(validateIr(json)).toEqual({ ok: true, errors: [] });
  });

  it.each(["true", 1, null])(
    "rejects reducedMotion %j at /settings/reducedMotion",
    (value) => {
      const json = withSettings(
        (settings) => (settings["reducedMotion"] = value),
      );
      expect(errorPaths(json)).toEqual(["/settings/reducedMotion"]);
    },
  );

  it("keeps the timeline of 1.2 manifests", () => {
    const ir = load("v1.2.json") as unknown as IrVideo;
    expect(hasTimeline(ir)).toBe(true);
  });

  it("rejects reducedMotion on a 1.1 manifest (1.1 is frozen)", () => {
    const json = {
      ...load("v1.1.json"),
      settings: {
        ...(load("v1.1.json")["settings"] as Doc),
        reducedMotion: true,
      },
    };
    expect(errorPaths(json)).toEqual(["/settings/reducedMotion"]);
  });
});
