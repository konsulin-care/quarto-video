// Stage 2 checks of region footage (task 043; ADR-0016; PRD §5.4 (10), §6.1). A
// component with `regions` (split-screen) uses a count of regions within its
// limit; each region is one of its slots; and a region holds its text or its
// footage, not both. Each region's video is checked on its own by stage 3. Pure:
// the contracts come in as data.
import type { IrMediaVideo } from "@quarto-video/ir";
import type { ComponentContract } from "@quarto-video/registry";
import type { Diagnostic } from "../diagnostic.js";
import { problem } from "./contract.js";
import type { SceneWithMedia } from "./media-placement.js";

/** The regions a scene uses: its filled slots and its region footage, sorted. */
function usedRegions(scene: SceneWithMedia): string[] {
  const names = new Set<string>();
  for (const [name, blocks] of Object.entries(scene.content.slots)) {
    if (blocks.length > 0) names.add(name);
  }
  for (const item of scene.media ?? []) {
    if (
      item.kind !== "image" &&
      item.placement === "region" &&
      item.region !== undefined
    ) {
      names.add(item.region);
    }
  }
  return [...names].sort();
}

/** The region checks of one scene whose component has `regions`. */
function regionProblems(
  scene: SceneWithMedia,
  contract: ComponentContract,
  limit: { min: number; max: number },
): Diagnostic[] {
  const slots = Object.keys(contract.slots);
  const footage = (scene.media ?? []).filter(
    (item): item is IrMediaVideo =>
      item.kind !== "image" &&
      item.placement === "region" &&
      item.region !== undefined,
  );
  const found: Diagnostic[] = [];
  for (const item of footage) {
    if (!slots.includes(item.region ?? "")) {
      found.push(
        problem(
          scene,
          "E_SLOT_UNKNOWN",
          `Scene has footage in region "${item.region ?? ""}", which "${contract.id}" does not have.`,
          "media",
          `The regions of "${contract.id}" are: ${slots.join(", ")}.`,
        ),
      );
    }
  }
  const used = usedRegions(scene);
  if (used.length < limit.min || used.length > limit.max) {
    const names = used.length === 0 ? "" : ` (${used.join(", ")})`;
    found.push(
      problem(
        scene,
        "E_REGION_COUNT",
        `Component "${contract.id}" takes ${limit.min} to ${limit.max} regions; this scene uses ${used.length}${names}.`,
        "regions",
        `Use ${limit.min} to ${limit.max} of its regions: ${slots.join(", ")}.`,
      ),
    );
  }
  for (const item of footage) {
    const name = item.region ?? "";
    if ((scene.content.slots[name] ?? []).length === 0) continue;
    found.push(
      problem(
        scene,
        "E_SLOT_CONSTRAINT",
        `Scene puts both text and footage in region "${name}".`,
        `slots/${name}`,
        `Keep either the text or the footage in region "${name}", not both.`,
      ),
    );
  }
  return found;
}

/** Region diagnostics for each scene of a component that has regions (task 043). */
export function checkRegions(
  ir: { scenes: readonly SceneWithMedia[] },
  components: readonly ComponentContract[],
): Diagnostic[] {
  const known = new Map(components.map((contract) => [contract.id, contract]));
  return ir.scenes.flatMap((scene): Diagnostic[] => {
    const contract = known.get(scene.component);
    if (contract?.regions === undefined) return [];
    return regionProblems(scene, contract, contract.regions);
  });
}
