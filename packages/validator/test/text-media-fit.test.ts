// The text fit of text-media (task 042): its text is fitted in its column beside
// the footage, not in the whole safe area. A paragraph that fits the full safe
// width but not the half-width column warns W_TEXT_FIT for text-media and not for
// statement, which takes the whole area.
import { readFileSync } from "node:fs";
import type { IrVideo } from "@quarto-video/ir";
import { getTheme } from "@quarto-video/registry";
import { describe, expect, it } from "vitest";
import { checkTextFit } from "../src/index.js";

const modern = getTheme("modern");

/** A 640x360 manifest with one scene: `component` holding `text` in its text slot. */
function manifest(
  component: string,
  text: string,
  props: Record<string, string> = {},
): IrVideo {
  const doc = JSON.parse(
    readFileSync(
      new URL("../../ir/examples/v1.1.json", import.meta.url),
      "utf8",
    ),
  ) as { settings: Record<string, unknown>; scenes: Record<string, unknown>[] };
  doc.settings = { ...doc.settings, width: 640, height: 360 };
  const scene = doc.scenes[0] ?? {};
  scene["component"] = component;
  scene["props"] = props;
  scene["content"] = {
    slots: {
      [component === "text-media" ? "text" : "default"]: [
        { type: "paragraph", inlines: [{ type: "text", text }] },
      ],
    },
  };
  return doc as unknown as IrVideo;
}

/** About one hundred characters: fits the 564 px safe width at body size, not a half column. */
const TEXT =
  "A paragraph of about one hundred characters fits across the full width of the frame but not in its half.";

describe("text-media text fit", () => {
  it("warns when the text needs more than its column, and names the column", () => {
    const found = checkTextFit(
      manifest("text-media", TEXT, { side: "left" }),
      modern,
    );
    expect(found).toEqual([
      expect.objectContaining({
        severity: "warning",
        code: "W_TEXT_FIT",
        sceneId: "scene-001",
        component: "text-media",
        property: "slots.text",
        message: expect.stringContaining("its text column"),
      }),
    ]);
  });

  it("does not warn for the same text in statement, which takes the safe area", () => {
    expect(checkTextFit(manifest("statement", TEXT), modern)).toEqual([]);
  });

  it("fits the column of the side the prop names, and the default side", () => {
    expect(checkTextFit(manifest("text-media", TEXT), modern)).toHaveLength(1);
  });
});
