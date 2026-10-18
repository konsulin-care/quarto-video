// Stage 2 check of a `.video` block's footage kind (task 041 follow-up; ADR-0018).
// A block whose placement its component takes must also be of a kind the contract
// lists in `mediaKinds` (default ["video"]): an image is E_MEDIA_KIND for a
// component that takes video only. A block of a placement the component does not
// take is E_MEDIA_PLACEMENT (media-placement.ts), so a block gets one error at most.
// Pure: the contracts come in as data.
import type { IrMedia, IrSceneV02 } from "@quarto-video/ir";
import type { ComponentContract } from "@quarto-video/registry";
import type { Diagnostic } from "../diagnostic.js";
import { problem } from "./contract.js";

type Kind = "video" | "image";

/** The footage kind of a `.video` item (IR 1.10; items before it are video). */
export function kindOf(item: IrMedia): Kind {
  return item.kind === "image" ? "image" : "video";
}

/** The ids of the components that take `kind` at `placement`, or "none yet". */
function takers(
  kind: Kind,
  placement: IrMedia["placement"],
  components: readonly ComponentContract[],
): string {
  const ids = components
    .filter((contract) => contract.placements.includes(placement))
    .filter((contract) => (contract.mediaKinds ?? ["video"]).includes(kind))
    .map((contract) => contract.id)
    .sort();
  return ids.length === 0 ? "none yet" : ids.join(", ");
}

/** E_MEDIA_KIND for each `.video` block whose kind its component does not take. */
export function checkMediaKind(
  ir: { scenes: readonly (IrSceneV02 & { media?: IrMedia[] })[] },
  components: readonly ComponentContract[],
): Diagnostic[] {
  const known = new Map(components.map((contract) => [contract.id, contract]));
  return ir.scenes.flatMap((scene): Diagnostic[] => {
    const contract = known.get(scene.component);
    if (contract === undefined) return [];
    return (scene.media ?? []).flatMap((item): Diagnostic[] => {
      if (!contract.placements.includes(item.placement)) return [];
      const kind = kindOf(item);
      if ((contract.mediaKinds ?? ["video"]).includes(kind)) return [];
      return [
        problem(
          scene,
          "E_MEDIA_KIND",
          `Component "${contract.id}" does not take ${kind} footage.`,
          "media",
          `Components that take ${kind} footage at "${item.placement}": ${takers(kind, item.placement, components)}.`,
        ),
      ];
    });
  });
}
