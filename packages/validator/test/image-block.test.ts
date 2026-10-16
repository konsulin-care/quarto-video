// Image blocks in the validator (task 033; ADR-0013). The fixtures cover the
// shape errors (stage 1) and the scene-level contract errors (stage 2). Here:
// an image in the caption slot is a contract error, which a fixture cannot
// show alone (a second image in the scene is a stage 1 error first), and the
// references stage 3 checks are the image blocks' src paths.
import { listComponents } from "@quarto-video/registry";
import type { IrVideoV02, IrBlock } from "@quarto-video/ir";
import { describe, expect, it } from "vitest";
import { checkContracts } from "../src/stages/contract.js";
import { assetRefsOf } from "../src/stages/assets.js";

const image: IrBlock = {
  type: "image",
  src: "assets/photo.png",
  fit: "contain",
  alt: "A photo",
};

function irWith(
  slots: Record<string, IrBlock[]>,
): Pick<IrVideoV02, "settings" | "scenes"> {
  return {
    settings: { width: 1920, height: 1080, fps: 30, background: "#000000" },
    scenes: [
      {
        id: "scene-001",
        component: "image",
        durationFrames: 60,
        source: { file: "index.qmd", line: 9 },
        content: { slots },
      },
    ],
  };
}

describe("image block contract", () => {
  it("rejects an image in the caption slot (the caption accepts paragraphs)", () => {
    const found = checkContracts(
      irWith({ default: [image], caption: [image] }),
      listComponents(),
    );
    expect(found).toEqual([
      expect.objectContaining({
        code: "E_SLOT_BLOCK_KIND",
        property: "slots.caption",
        line: 9,
        sceneId: "scene-001",
      }),
    ]);
  });

  it("accepts one image in the default slot and a paragraph caption", () => {
    const paragraph: IrBlock = {
      type: "paragraph",
      inlines: [{ type: "text", text: "A caption." }],
    };
    const found = checkContracts(
      irWith({ default: [image], caption: [paragraph] }),
      listComponents(),
    );
    expect(found).toEqual([]);
  });
});

describe("image block asset references", () => {
  it("names each image block's src, with its scene and opening line", () => {
    expect(assetRefsOf(irWith({ default: [image] }))).toEqual([
      {
        path: "assets/photo.png",
        sceneId: "scene-001",
        file: "index.qmd",
        line: 9,
      },
    ]);
  });

  it("names no reference for a scene with no image", () => {
    const paragraph: IrBlock = {
      type: "paragraph",
      inlines: [{ type: "text", text: "Text." }],
    };
    expect(assetRefsOf(irWith({ default: [paragraph] }))).toEqual([]);
  });
});
