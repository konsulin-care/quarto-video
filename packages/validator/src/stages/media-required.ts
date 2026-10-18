// Stage 2 check that a component which needs footage has some (task 041; PRD §5.5,
// §6.1). A contract with `requiresMedia` (product-demo) needs one `.video` block
// in its scene. Any `.video` block counts here, even one whose placement the
// component does not take: E_MEDIA_PLACEMENT reports that block, so one scene
// never gets both errors for one block. Pure: the contracts come in as data.
import type { ComponentContract } from "@quarto-video/registry";
import type { Diagnostic } from "../diagnostic.js";
import { problem } from "./contract.js";
import type { SceneWithMedia } from "./media-placement.js";

/** E_SLOT_MISSING for each scene whose component needs footage and has no `.video` block. */
export function checkMediaRequired(
  ir: { scenes: readonly SceneWithMedia[] },
  components: readonly ComponentContract[],
): Diagnostic[] {
  const known = new Map(components.map((contract) => [contract.id, contract]));
  return ir.scenes.flatMap((scene): Diagnostic[] => {
    const contract = known.get(scene.component);
    if (contract?.requiresMedia !== true) return [];
    if ((scene.media ?? []).length > 0) return [];
    const placements = contract.placements.map((p) => `"${p}"`).join(", ");
    return [
      problem(
        scene,
        "E_SLOT_MISSING",
        `Component "${contract.id}" needs footage: the scene has no .video block.`,
        "media",
        `Add one .video block with placement ${placements}; the component takes that placement.`,
      ),
    ];
  });
}
