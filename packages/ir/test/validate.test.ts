import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateIr } from "../src/validate.js";

type Scene = Record<string, unknown>;
interface Doc {
  [key: string]: unknown;
  settings: Record<string, unknown>;
  scenes: Scene[];
}

const minimal: unknown = JSON.parse(
  readFileSync(new URL("../examples/minimal.json", import.meta.url), "utf8"),
);

/** Returns a fresh copy of the example with `edit` applied. */
function withEdit(edit: (doc: Doc) => void): unknown {
  const doc = structuredClone(minimal) as Doc;
  edit(doc);
  return doc;
}

function firstScene(doc: Doc): Scene {
  const scene = doc.scenes[0];
  if (scene === undefined) throw new Error("fixture has no scene");
  return scene;
}

function paths(json: unknown): string[] {
  const result = validateIr(json);
  return result.ok ? [] : result.errors.map((e) => e.path);
}

describe("validateIr", () => {
  it("accepts examples/minimal.json", () => {
    expect(validateIr(minimal)).toEqual({ ok: true, errors: [] });
  });

  it("rejects a scene without durationFrames at /scenes/0/durationFrames", () => {
    const json = withEdit((d) => delete firstScene(d).durationFrames);
    expect(paths(json)).toEqual(["/scenes/0/durationFrames"]);
  });

  it("rejects fractional durationFrames at /scenes/0/durationFrames", () => {
    const json = withEdit((d) => (firstScene(d).durationFrames = 1.5));
    expect(paths(json)).toEqual(["/scenes/0/durationFrames"]);
  });

  it("rejects zero durationFrames at /scenes/0/durationFrames", () => {
    const json = withEdit((d) => (firstScene(d).durationFrames = 0));
    expect(paths(json)).toEqual(["/scenes/0/durationFrames"]);
  });

  it("rejects negative fps at /settings/fps", () => {
    const json = withEdit((d) => (d.settings["fps"] = -1));
    expect(paths(json)).toEqual(["/settings/fps"]);
  });

  it("rejects an unknown top-level key at /<key>", () => {
    const json = withEdit((d) => (d["extra"] = true));
    expect(paths(json)).toEqual(["/extra"]);
  });

  it("rejects an unsupported schemaVersion at /schemaVersion", () => {
    const json = withEdit((d) => (d["schemaVersion"] = "9.9"));
    expect(paths(json)).toEqual(["/schemaVersion"]);
  });

  it("rejects an unknown key inside a scene at its own path", () => {
    const json = withEdit((d) => (firstScene(d)["transition"] = {}));
    expect(paths(json)).toEqual(["/scenes/0/transition"]);
  });

  it("rejects a non-object root at the root path", () => {
    expect(paths([])).toEqual([""]);
  });

  it("reports every error, not only the first", () => {
    const json = withEdit((d) => {
      d.settings["fps"] = 0;
      firstScene(d).durationFrames = 2.5;
    });
    expect(paths(json).sort()).toEqual([
      "/scenes/0/durationFrames",
      "/settings/fps",
    ]);
  });

  it("accepts source.line on a scene", () => {
    const json = withEdit((d) => {
      (firstScene(d)["source"] as Record<string, unknown>)["line"] = 3;
    });
    expect(validateIr(json)).toEqual({ ok: true, errors: [] });
  });

  it("rejects source.line below 1 at /scenes/0/source/line", () => {
    const json = withEdit((d) => {
      (firstScene(d)["source"] as Record<string, unknown>)["line"] = 0;
    });
    expect(paths(json)).toEqual(["/scenes/0/source/line"]);
  });
});
