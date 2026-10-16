// `text-overlay` stands in for `default` when `default` is empty (task 039).
import { describe, expect, it } from "vitest";
import type { IrBlock } from "@quarto-video/ir";
import { withOverlay } from "../src/overlay.js";

const overlayBlock: IrBlock[] = [{ type: "paragraph", inlines: [] }];

describe("text-overlay text", () => {
  it("draws the overlay as the default text when default is empty", () => {
    const content = withOverlay(
      { "text-overlay": "Over the footage" },
      {
        "text-overlay": overlayBlock,
      },
    );
    expect(content.texts["default"]).toBe("Over the footage");
    expect(content.blocks["default"]).toBe(overlayBlock);
  });

  it("keeps default when the scene has no overlay", () => {
    const content = withOverlay({ default: "Plain" }, {});
    expect(content.texts).toEqual({ default: "Plain" });
  });

  it("returns copies, so the scene content is not changed", () => {
    const texts = { "text-overlay": "Over" };
    withOverlay(texts, {});
    expect(texts).toEqual({ "text-overlay": "Over" });
  });
});
