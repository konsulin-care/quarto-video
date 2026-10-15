// The transition preset registry (PRD §5.6, task 022): the shipped presets, each
// rule that rejects a bad preset file, and the link to transitions.json.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  listTransitionPresets,
  loadTransitionDir,
  parseTransitionPreset,
  RegistryError,
} from "../src/index.js";

const NAMES = ["cut", "fade", "slide", "wipe", "zoom"];
const BASE = {
  id: "fade",
  version: "1.0.0",
  purpose: "Fades.",
  duration: { defaultMs: 500, minMs: 100, maxMs: 3000 },
  reducedMotion: "fade",
};
const text = (patch: Record<string, unknown>) =>
  JSON.stringify({ ...BASE, ...patch });

describe("transition presets", () => {
  it("ships one preset for each listed name, sorted", () => {
    expect(listTransitionPresets().map((p) => p.id)).toEqual(NAMES);
  });

  it("gives cut no frames and every other preset a motion-free fallback", () => {
    const presets = listTransitionPresets();
    const cut = presets.find((p) => p.id === "cut");
    expect(cut?.duration).toEqual({ defaultMs: 0, minMs: 0, maxMs: 0 });
    for (const preset of presets) {
      expect(NAMES).toContain(preset.reducedMotion);
      if (preset.id !== "cut") {
        expect(preset.duration.minMs).toBeGreaterThan(0);
        expect(["cut", "fade"]).toContain(preset.reducedMotion);
      }
    }
  });

  it("returns copies: a caller cannot change the registry", () => {
    listTransitionPresets()[0]!.duration.maxMs = 1;
    expect(listTransitionPresets()[0]!.duration.maxMs).toBe(0);
  });
});

describe("transition preset files", () => {
  let dir: string | undefined;
  afterEach(() => {
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it("parses a valid preset", () => {
    expect(parseTransitionPreset(text({}), "fade.json").id).toBe("fade");
  });

  it.each([
    ["not JSON", "{", "not valid JSON"],
    ["an unknown field", text({ easing: "linear" }), '"easing"'],
    ["a missing duration", text({ duration: undefined }), "duration"],
    [
      "a negative bound",
      text({ duration: { defaultMs: 500, minMs: -1, maxMs: 3000 } }),
      "minMs",
    ],
    [
      "a default outside the bounds",
      text({ duration: { defaultMs: 50, minMs: 100, maxMs: 3000 } }),
      "minMs <= defaultMs <= maxMs",
    ],
    [
      "a zero minimum on a motion preset",
      text({ duration: { defaultMs: 0, minMs: 0, maxMs: 3000 } }),
      "minMs must be at least 1",
    ],
    [
      "a cut with a length",
      text({
        id: "cut",
        duration: { defaultMs: 0, minMs: 0, maxMs: 500 },
        reducedMotion: "cut",
      }),
      "cut takes no frames",
    ],
  ])("rejects %s", (_label, file, message) => {
    const name = file.includes('"id":"cut"') ? "cut.json" : "fade.json";
    expect(() => parseTransitionPreset(file, name)).toThrow(RegistryError);
    expect(() => parseTransitionPreset(file, name)).toThrow(message);
  });

  it("rejects a file whose id is not its name", () => {
    expect(() => parseTransitionPreset(text({}), "wipe.json")).toThrow(
      'id "fade" must match the file name (fade.json)',
    );
  });

  const scratch = (files: Record<string, string>): string => {
    dir = mkdtempSync(join(tmpdir(), "qv-transitions-"));
    for (const [name, body] of Object.entries(files)) {
      writeFileSync(join(dir, name), body);
    }
    return dir;
  };
  const cut = JSON.stringify({
    id: "cut",
    version: "1.0.0",
    purpose: "Cut.",
    duration: { defaultMs: 0, minMs: 0, maxMs: 0 },
    reducedMotion: "cut",
  });

  it("requires a preset file for every listed name", () => {
    const path = scratch({ "cut.json": cut });
    expect(() => loadTransitionDir(path, ["cut", "fade"])).toThrow(
      'transitions.json: "fade" has no preset file',
    );
  });

  it("rejects a preset file whose name is not listed", () => {
    const path = scratch({ "cut.json": cut, "fade.json": text({}) });
    expect(() => loadTransitionDir(path, ["cut"])).toThrow(
      'transitions/fade.json: "fade" is not listed in transitions.json',
    );
  });

  it("rejects a reduced-motion name that is not a listed transition", () => {
    const path = scratch({
      "cut.json": cut,
      "fade.json": text({ reducedMotion: "spin" }),
    });
    expect(() => loadTransitionDir(path, ["cut", "fade"])).toThrow(
      'transitions/fade.json: reducedMotion "spin" is not a listed transition',
    );
  });

  it("rejects a stray file in the directory", () => {
    const path = scratch({ "cut.json": cut, "notes.md": "x" });
    expect(() => loadTransitionDir(path, ["cut"])).toThrow(
      "only <id>.json transition files belong here",
    );
  });
});
