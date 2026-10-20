// IR 1.12 (ADR-0020): a scene may carry an exit preset and the length of its
// animation window (animationDuration, in frames). IR 1.11 rejects both, since
// it is frozen. The validator checks the presets and the window against the scene.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateIr } from "../src/validate.js";

type Doc = Record<string, unknown>;

const load = (file: string): Doc =>
  JSON.parse(
    readFileSync(new URL(`../examples/${file}`, import.meta.url), "utf8"),
  );

/** A fresh copy of the 1.12 example with `edit` applied to its first scene. */
function withScene(edit: (scene: Doc) => void): unknown {
  const doc = load("v1.12.json");
  const scenes = doc["scenes"] as Doc[];
  edit(scenes[0] as Doc);
  return doc;
}

function errorPaths(json: unknown): string[] {
  const result = validateIr(json);
  return result.ok ? [] : result.errors.map((e) => e.path);
}

describe("IR 1.12 scene exit and animation window", () => {
  it("accepts examples/v1.12.json: an entrance, an exit and a 30-frame window", () => {
    expect(validateIr(load("v1.12.json"))).toEqual({ ok: true, errors: [] });
  });

  it("accepts a scene with an exit alone and with a window alone", () => {
    const exitOnly = withScene((s) => delete s["animation"]);
    expect(validateIr(exitOnly)).toEqual({ ok: true, errors: [] });
    const windowOnly = withScene((s) => delete s["exit"]);
    expect(validateIr(windowOnly)).toEqual({ ok: true, errors: [] });
  });

  it("rejects an exit without a name, or with a name that is not an id", () => {
    expect(errorPaths(withScene((s) => (s["exit"] = {})))).toEqual([
      "/scenes/0/exit/name",
    ]);
    expect(
      errorPaths(withScene((s) => (s["exit"] = { name: "Fade Out" }))),
    ).toEqual(["/scenes/0/exit/name"]);
  });

  it("rejects an exit with an unknown key", () => {
    expect(
      errorPaths(
        withScene((s) => (s["exit"] = { name: "fade-out", speed: 2 })),
      ),
    ).toEqual(["/scenes/0/exit/speed"]);
  });

  it("rejects an animationDurationFrames below one frame or not a whole number", () => {
    for (const value of [0, -3, 1.5, "15"]) {
      expect(
        errorPaths(withScene((s) => (s["animationDurationFrames"] = value))),
      ).toEqual(["/scenes/0/animationDurationFrames"]);
    }
  });

  it("accepts animationDurationFrames of one frame", () => {
    expect(
      validateIr(withScene((s) => (s["animationDurationFrames"] = 1))),
    ).toEqual({ ok: true, errors: [] });
  });

  it("rejects exit and animationDurationFrames in IR 1.11 (frozen)", () => {
    const doc = load("v1.12.json");
    doc["schemaVersion"] = "1.11";
    expect(errorPaths(doc).sort()).toEqual([
      "/scenes/0/animationDurationFrames",
      "/scenes/0/exit",
    ]);
  });
});
