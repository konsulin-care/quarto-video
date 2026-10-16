// The text-media layout (task 042; PRD §10.2): the text column and the frame
// never overlap on either side, at every canvas shape; the frame sits inside its
// column; the text's size fits its column, long text included; and the constants
// the renderer uses are the contract's (`textFit`, the `side` default).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getComponent, getTheme } from "@quarto-video/registry";
import {
  fitText,
  mediaSideOf,
  textMediaColumns,
  type Rect,
} from "@quarto-video/registry/layout";
import { fitFrame, insideRect } from "../media/frames/layout.js";
import { frameContract } from "../media/frames/tokens.js";
import { TEXT_FIT } from "../components/text-media/TextMedia.js";

const CANVASES = [
  { width: 640, height: 360 },
  { width: 1920, height: 1080 },
  { width: 360, height: 640 },
  { width: 640, height: 480 },
];

const LONG =
  "A long paragraph beside the footage keeps going: it wraps across several lines inside its own column and scales down so it never runs under the frame or past the edge of the canvas.";

const theme = getTheme("modern");

function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.left < b.left + b.width &&
    b.left < a.left + a.width &&
    a.top < b.top + b.height &&
    b.top < a.top + a.height
  );
}

describe("text-media columns and frame", () => {
  for (const { width, height } of CANVASES) {
    for (const side of ["left", "right"] as const) {
      it(`keeps the text and the frame apart (${side}, ${width}x${height})`, () => {
        const columns = textMediaColumns(theme, width, height, side);
        for (const frame of ["browser", "phone", "tablet", "generic"]) {
          const contract = frameContract(frame);
          const box = fitFrame(columns.media, contract.aspect);
          expect(insideRect(box, columns.media)).toBe(true);
          expect(overlaps(columns.text, box)).toBe(false);
        }
      });
    }
  }

  it("wraps long text inside its column and fits it at a smaller size", () => {
    const columns = textMediaColumns(theme, 1920, 1080, "right");
    const box = { width: columns.text.width, height: columns.text.height };
    const fit = fitText(LONG, box, theme, TEXT_FIT);
    expect(fit.fits).toBe(true);
    expect(fit.fontPx).toBeLessThan(theme.typography.scale["title"]);
    expect(fit.lines).toBeGreaterThan(1);
  });

  it("reports long text that cannot fit a small column, at the smallest size", () => {
    const columns = textMediaColumns(theme, 640, 360, "right");
    const box = { width: columns.text.width, height: columns.text.height };
    const fit = fitText(LONG, box, theme, TEXT_FIT);
    expect(fit.fits).toBe(false);
    expect(fit.fontPx).toBe(theme.typography.scale["body"]);
  });
});

describe("text-media contract", () => {
  it("takes the same text range and side default as the renderer", () => {
    const contract = getComponent("text-media");
    expect(contract.textFit).toEqual(TEXT_FIT);
    expect(contract.props["side"]).toEqual({
      type: "enum",
      enum: ["left", "right"],
      default: mediaSideOf(undefined),
    });
  });

  it("is placed beside framed footage only, with the footage required", () => {
    const contract = getComponent("text-media");
    expect(contract.placements).toEqual(["framed"]);
    expect(contract.requiresMedia).toBe(true);
    expect(Object.keys(contract.slots)).toEqual(["text"]);
    expect(
      readFileSync(
        new URL(
          "../../../packages/registry/components/text-media.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ).toContain('"requiresMedia": true');
  });

  it("reads side from the scene prop, the default when absent", () => {
    expect(mediaSideOf("left")).toBe("left");
    expect(mediaSideOf(undefined)).toBe("right");
  });
});
