// IR 1.1 (ADR-0011): IR 1.0 plus an optional scene animation. Every 1.0 rule
// still holds; the animation is checked for shape only (the registry checks
// the preset id in the validator).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hasTimeline } from "../src/timeline.js";
import { timelineOf } from "../src/timeline.js";
import { validateIr } from "../src/validate.js";
import type { IrVideo } from "../src/types.js";

type Doc = Record<string, unknown>;

const load = (file: string): Doc =>
  JSON.parse(
    readFileSync(new URL(`../examples/${file}`, import.meta.url), "utf8"),
  );

/** A fresh copy of the 1.1 example with `edit` applied to its first scene. */
function edited(edit: (scene: Doc) => void, file = "v1.1.json"): unknown {
  const doc = load(file);
  const scenes = doc["scenes"] as Doc[];
  edit(scenes[0] as Doc);
  return doc;
}

function errorPaths(json: unknown): string[] {
  const result = validateIr(json);
  return result.ok ? [] : result.errors.map((e) => e.path);
}

describe("IR 1.1 animation", () => {
  it("accepts examples/v1.1.json, whose first scene has fade-in", () => {
    expect(validateIr(load("v1.1.json"))).toEqual({ ok: true, errors: [] });
    const first = (load("v1.1.json")["scenes"] as Doc[])[0];
    expect(first?.["animation"]).toEqual({ name: "fade-in" });
  });

  it("accepts a scene without an animation", () => {
    const json = edited((scene) => delete scene["animation"]);
    expect(validateIr(json)).toEqual({ ok: true, errors: [] });
  });

  it("keeps the timeline of 1.1 manifests", () => {
    const ir = load("v1.1.json") as unknown as IrVideo;
    expect(hasTimeline(ir)).toBe(true);
    expect(timelineOf(ir).durationFrames).toBe(300);
  });

  it("requires a name at /scenes/0/animation/name", () => {
    const json = edited((scene) => {
      scene["animation"] = {};
    });
    expect(errorPaths(json)).toEqual(["/scenes/0/animation/name"]);
  });

  it.each(["Fade-In", "fade in", "1fade", ""])(
    "rejects animation name %j at /scenes/0/animation/name",
    (name) => {
      const json = edited((scene) => {
        scene["animation"] = { name };
      });
      expect(errorPaths(json)).toEqual(["/scenes/0/animation/name"]);
    },
  );

  it("rejects an unknown key in animation at /scenes/0/animation/easing", () => {
    const json = edited((scene) => {
      scene["animation"] = { name: "fade-in", easing: "linear" };
    });
    expect(errorPaths(json)).toEqual(["/scenes/0/animation/easing"]);
  });

  it("rejects an animation on a 1.0 manifest (1.0 is frozen)", () => {
    const json = edited((scene) => {
      scene["animation"] = { name: "fade-in" };
    }, "v1.json");
    expect(errorPaths(json)).toContain("/scenes/0/animation");
  });
});
