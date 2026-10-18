// Device frame contracts the renderer draws (task 040; PRD §5.5): the frames in
// packages/registry/frames, imported as data, the way themes/tokens.ts imports
// themes (the renderer never loads the registry's files). The renderer's parity
// test keeps this map equal to the registry's list.
import type { FrameContract } from "@quarto-video/registry";
import browser from "@quarto-video/registry/frames/browser.json" with { type: "json" };
import generic from "@quarto-video/registry/frames/generic.json" with { type: "json" };
import phone from "@quarto-video/registry/frames/phone.json" with { type: "json" };
import tablet from "@quarto-video/registry/frames/tablet.json" with { type: "json" };

const CONTRACTS: Readonly<Record<string, FrameContract>> = {
  browser: browser as FrameContract,
  generic: generic as FrameContract,
  phone: phone as FrameContract,
  tablet: tablet as FrameContract,
};

/** The ids this renderer draws, sorted. */
export function frameIds(): string[] {
  return Object.keys(CONTRACTS).sort();
}

/** The contract of frame `id`; an unknown id is an Error naming the known ids. */
export function frameContract(id: string): FrameContract {
  const found = CONTRACTS[id];
  if (found === undefined) {
    throw new Error(`unknown frame "${id}" (known: ${frameIds().join(", ")})`);
  }
  return found;
}
