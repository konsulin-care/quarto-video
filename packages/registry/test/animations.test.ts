// The animation preset registry (PRD §5.6, task 021): the shipped presets, each
// rule that rejects a bad preset file, and the link to component contracts.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  getAnimation,
  getComponent,
  listAnimations,
  listComponents,
  loadAnimationDir,
  parseAnimation,
  RegistryError,
} from "../src/index.js";

const BASE = {
  id: "fade-in",
  version: "1.0.0",
  purpose: "Fades in.",
  compatibleComponents: ["title"],
  minFrames: 15,
  shortScene: "static",
  reducedMotion: "static",
};
const text = (patch: Record<string, unknown>) =>
  JSON.stringify({ ...BASE, ...patch });

describe("animation presets", () => {
  it("lists fade-in, reveal and slide-up, sorted", () => {
    expect(listAnimations().map((preset) => preset.id)).toEqual([
      "fade-in",
      "reveal",
      "slide-up",
    ]);
  });

  it("gives every shipped preset a fallback and a reduced-motion rule", () => {
    for (const preset of listAnimations()) {
      expect(preset.shortScene).toBe("static");
      expect(preset.reducedMotion).toBe("static");
      expect(preset.minFrames).toBeGreaterThan(0);
      expect(preset.compatibleComponents.length).toBeGreaterThan(0);
    }
  });

  it("links each preset and each component both ways", () => {
    const components = listComponents();
    for (const preset of listAnimations()) {
      for (const component of preset.compatibleComponents) {
        expect(getComponent(component).compatibleAnimations).toContain(
          preset.id,
        );
      }
    }
    for (const component of components) {
      for (const id of component.compatibleAnimations) {
        expect(getAnimation(id).compatibleComponents).toContain(component.id);
      }
    }
  });

  it("returns copies, so a caller cannot change the registry", () => {
    const first = getAnimation("reveal");
    first.compatibleComponents.push("statement");
    expect(getAnimation("reveal").compatibleComponents).toEqual(["title"]);
  });

  it("rejects an unknown preset id with an error, not undefined", () => {
    expect(() => getAnimation("kinetic")).toThrow(RegistryError);
    expect(() => getAnimation("kinetic")).toThrow(
      /unknown animation "kinetic" \(known: fade-in, reveal, slide-up\)/,
    );
  });

  it("parses a valid preset", () => {
    expect(parseAnimation(text({}), "fade-in.json").id).toBe("fade-in");
  });

  it.each([
    ["not JSON", "{", "not valid JSON"],
    [
      "an unknown field",
      text({ easing: "linear" }),
      '"easing"',
    ],
    [
      "no compatible components",
      text({ compatibleComponents: [] }),
      "/compatibleComponents: must NOT have fewer than 1 items",
    ],
    [
      "a repeated component",
      text({ compatibleComponents: ["title", "title"] }),
      "must NOT have duplicate items",
    ],
    ["zero minFrames", text({ minFrames: 0 }), "/minFrames: must be >= 1"],
    [
      "a fractional minFrames",
      text({ minFrames: 1.5 }),
      "/minFrames: must be integer",
    ],
    [
      "a short-scene rule other than static",
      text({ shortScene: "compress" }),
      "/shortScene: must be equal to one of the allowed values",
    ],
    [
      "a reduced-motion rule other than static",
      text({ reducedMotion: "fade" }),
      "/reducedMotion: must be equal to one of the allowed values",
    ],
    [
      "a pixel value in a field",
      text({ purpose: "x".repeat(201) }),
      "/purpose: must NOT have more than 200 characters",
    ],
    [
      "an uppercase id",
      text({ id: "Fade-In" }),
      "/id: must match pattern",
    ],
    [
      "a version without patch",
      text({ version: "1.0" }),
      "/version: must match pattern",
    ],
  ])("rejects %s", (_name, body, message) => {
    expect(() => parseAnimation(body, "fade-in.json")).toThrow(RegistryError);
    expect(() => parseAnimation(body, "fade-in.json")).toThrow(message);
  });

  it("rejects a file whose id is not its file name", () => {
    expect(() => parseAnimation(text({}), "slide-up.json")).toThrow(
      /id "fade-in" must match the file name \(fade-in.json\)/,
    );
  });

  describe("directory", () => {
    let dir: string | undefined;
    afterEach(() => {
      if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
      dir = undefined;
    });

    it("rejects a stray file that is not a preset", () => {
      dir = mkdtempSync(join(tmpdir(), "qv-animations-"));
      writeFileSync(join(dir, "fade-in.json"), text({}));
      writeFileSync(join(dir, "notes.txt"), "hello");
      expect(() => loadAnimationDir(dir ?? "")).toThrow(
        "notes.txt: only <id>.json preset files belong here",
      );
    });
  });
});
