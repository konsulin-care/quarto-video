// Scene animations at stage 2 (PRD §5.6; ADR-0011): a known preset that applies
// to the scene's component passes; an unknown or incompatible preset is an
// error on its scene. Uses the shipped registry, and copies of it where a case
// needs a different contract.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  listAnimations,
  listComponents,
  listTransitionPresets,
  type AnimationPreset,
  type ComponentContract,
} from "@quarto-video/registry";
import { checkManifest } from "../src/index.js";

const example = (file: string): Record<string, unknown> =>
  JSON.parse(
    readFileSync(new URL(`../../ir/examples/${file}`, import.meta.url), "utf8"),
  ) as Record<string, unknown>;

/** The 1.1 example with `animation` set on its first scene. */
function animated(name: string | null): Record<string, unknown> {
  const doc = example("v1.1.json");
  const scenes = doc["scenes"] as Record<string, unknown>[];
  const first = scenes[0] as Record<string, unknown>;
  if (name === null) delete first["animation"];
  else first["animation"] = { name };
  return doc;
}

const run = (
  json: unknown,
  components: readonly ComponentContract[] = listComponents(),
  presets: readonly AnimationPreset[] = listAnimations(),
) =>
  checkManifest(
    json,
    "index.qmd",
    components,
    listTransitionPresets(),
    undefined,
    presets,
  );

describe("scene animations", () => {
  it("passes a registered preset that applies to the component", () => {
    expect(run(animated("fade-in")).diagnostics).toEqual([]);
    expect(run(animated("slide-up")).ir).not.toBeNull();
  });

  it("passes a scene with no animation", () => {
    expect(run(animated(null)).diagnostics).toEqual([]);
  });

  it("reports an unknown preset on its scene, listing the known ones", () => {
    const [found] = run(animated("kinetic")).diagnostics;
    expect(found).toMatchObject({
      severity: "error",
      code: "E_ANIMATION_UNKNOWN",
      message: 'Unknown animation "kinetic" on scene "scene-001".',
      sceneId: "scene-001",
      component: "title",
      property: "animation",
      suggestion: "Known animations: fade-in, reveal, slide-up.",
    });
    expect(run(animated("kinetic")).ir).toBeNull();
  });

  it("reports a preset that the component does not list as compatible", () => {
    const title = listComponents().find((c) => c.id === "title");
    const bare = { ...(title as ComponentContract), compatibleAnimations: [] };
    const [found] = run(animated("fade-in"), [bare]).diagnostics;
    expect(found).toMatchObject({
      code: "E_ANIMATION_INCOMPATIBLE",
      message: 'Animation "fade-in" does not apply to component "title".',
      suggestion: 'Animations for "title": none.',
    });
  });

  it("reports a preset whose own compatible components leave the scene out", () => {
    const presets = listAnimations().map((p) =>
      p.id === "fade-in" ? { ...p, compatibleComponents: ["statement"] } : p,
    );
    const [found] = run(
      animated("fade-in"),
      listComponents(),
      presets,
    ).diagnostics;
    expect(found?.code).toBe("E_ANIMATION_INCOMPATIBLE");
  });

  it("leaves a scene with an unknown component to E_COMPONENT_UNKNOWN", () => {
    const doc = animated("kinetic");
    (doc["scenes"] as Record<string, unknown>[])[0]!["component"] = "hero";
    expect(run(doc).diagnostics.map((d) => d.code)).toEqual([
      "E_COMPONENT_UNKNOWN",
    ]);
  });

  it("reports an unknown preset when no presets are registered", () => {
    const [found] = run(animated("fade-in"), listComponents(), []).diagnostics;
    expect(found?.code).toBe("E_ANIMATION_UNKNOWN");
    expect(found?.suggestion).toBe("Known animations: none.");
  });
});
