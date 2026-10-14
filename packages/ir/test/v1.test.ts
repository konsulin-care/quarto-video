// IR 1.0 (ADR-0007): the frozen shape is 0.3 plus a required generator block.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { timelineOf } from "../src/timeline.js";
import { validateIr } from "../src/validate.js";
import type { IrVideo } from "../src/types.js";

type Doc = Record<string, unknown>;

const load = (file: string): Doc =>
  JSON.parse(
    readFileSync(new URL(`../examples/${file}`, import.meta.url), "utf8"),
  );

/** Returns a fresh copy of the 1.0 example with `edit` applied. */
function edited(edit: (doc: Doc) => void): unknown {
  const doc = load("v1.json");
  edit(doc);
  return doc;
}

function paths(json: unknown): string[] {
  const result = validateIr(json);
  return result.ok ? [] : result.errors.map((e) => e.path);
}

describe("IR 1.0", () => {
  it("accepts examples/v1.json, and timelineOf reads its timeline", () => {
    expect(validateIr(load("v1.json"))).toEqual({ ok: true, errors: [] });
    expect(
      timelineOf(load("v1.json") as unknown as IrVideo).durationFrames,
    ).toBe(300);
  });

  it("requires the generator block at /generator", () => {
    expect(paths(edited((d) => delete d["generator"]))).toEqual(["/generator"]);
  });

  it.each(["0.1", "v0.1.0", "0.1.0.0", "latest"])(
    "rejects extension version %j at /generator/extension",
    (version) => {
      const json = edited((d) => {
        (d["generator"] as Doc)["extension"] = version;
      });
      expect(paths(json)).toEqual(["/generator/extension"]);
    },
  );

  it("rejects a cli version with a leading v at /generator/cli", () => {
    const json = edited((d) => {
      (d["generator"] as Doc)["cli"] = "v0.0.0";
    });
    expect(paths(json)).toEqual(["/generator/cli"]);
  });

  it("rejects an unknown key in generator at /generator/build", () => {
    const json = edited((d) => {
      (d["generator"] as Doc)["build"] = "ci";
    });
    expect(paths(json)).toEqual(["/generator/build"]);
  });

  it("rejects a generator block in IR 0.3, which has none", () => {
    const json = {
      ...load("timeline.json"),
      generator: load("v1.json")["generator"],
    };
    expect(paths(json)).toEqual(["/generator"]);
  });

  it("still reads a 0.3 manifest with no generator block", () => {
    expect(validateIr(load("timeline.json"))).toEqual({ ok: true, errors: [] });
  });

  it("requires the timeline section at /timeline", () => {
    expect(paths(edited((d) => delete d["timeline"]))).toEqual(["/timeline"]);
  });
});
