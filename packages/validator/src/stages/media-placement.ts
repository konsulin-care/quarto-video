// Stage 2 placement check for `.video` footage (task 039; PRD §6.1, §5.5). A
// block's placement must be one its component lists in `placements` of its
// contract (background, or framed once task 040 adds it). Pure: the contracts
// come in as data. An unknown component is reported by the contract check.
import type { IrMedia, IrSceneV02 } from "@quarto-video/ir";
import type { ComponentContract } from "@quarto-video/registry";
import type { Diagnostic } from "../diagnostic.js";
import { problem } from "./contract.js";

/** A scene with its `.video` media (IR 1.6). */
export type SceneWithMedia = IrSceneV02 & { media?: IrMedia[] };

/** The ids of the components whose contract lists `placement`, or "none yet". */
function takers(
  placement: IrMedia["placement"],
  components: readonly ComponentContract[],
): string {
  const ids = components
    .filter((contract) => contract.placements.includes(placement))
    .map((contract) => contract.id)
    .sort();
  return ids.length === 0 ? "none yet" : ids.join(", ");
}

/** E_MEDIA_PLACEMENT for each `.video` block whose placement its component does not take. */
export function checkMediaPlacement(
  ir: { scenes: readonly SceneWithMedia[] },
  components: readonly ComponentContract[],
): Diagnostic[] {
  const known = new Map(components.map((contract) => [contract.id, contract]));
  return ir.scenes.flatMap((scene): Diagnostic[] => {
    const contract = known.get(scene.component);
    if (contract === undefined) return [];
    return (scene.media ?? []).flatMap((item): Diagnostic[] => {
      if (contract.placements.includes(item.placement)) return [];
      return [
        problem(
          scene,
          "E_MEDIA_PLACEMENT",
          `Component "${contract.id}" does not take "${item.placement}" footage.`,
          "media",
          `Components that take "${item.placement}" footage: ${takers(item.placement, components)}.`,
        ),
      ];
    });
  });
}
