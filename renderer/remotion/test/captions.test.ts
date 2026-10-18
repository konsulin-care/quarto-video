// Burned captions (task 046; ADR-0019): which cue shows on which frame, which
// captions a render burns, where the panel sits, and the contrast rule for the
// caption text over any background (PRD §12).
import { describe, expect, it } from "vitest";
import { contrastRatio, getTheme } from "@quarto-video/registry";
import type { IrCaptionCue, IrCaptions } from "@quarto-video/ir";
import {
  burnedCues,
  captionPlacement,
  captionStyle,
  cueAt,
} from "../media/captions.js";

const MODERN = getTheme("modern");

const CUES: IrCaptionCue[] = [
  { startFrame: 15, endFrame: 75, text: "First\nsecond line" },
  { startFrame: 90, endFrame: 91, text: "A single frame" },
];

describe("cue on a frame", () => {
  it("shows the cue from its first frame to its last", () => {
    expect(cueAt(CUES, 15)?.text).toBe("First\nsecond line");
    expect(cueAt(CUES, 74)?.text).toBe("First\nsecond line");
  });

  it("shows nothing before the first frame or on the end frame", () => {
    expect(cueAt(CUES, 14)).toBeUndefined();
    expect(cueAt(CUES, 75)).toBeUndefined();
  });

  it("shows nothing between cues", () => {
    expect(cueAt(CUES, 80)).toBeUndefined();
  });

  it("shows a cue of one frame on that frame only", () => {
    expect(cueAt(CUES, 90)?.text).toBe("A single frame");
    expect(cueAt(CUES, 91)).toBeUndefined();
  });
});

describe("burned captions by mode", () => {
  const track = (
    mode: IrCaptions["mode"],
    cues?: IrCaptionCue[],
  ): IrCaptions => ({
    src: "assets/captions.vtt",
    mode,
    ...(cues === undefined ? {} : { cues }),
  });

  it("burns in burn and both modes", () => {
    expect(burnedCues(track("burn", CUES))).toEqual(CUES);
    expect(burnedCues(track("both", CUES))).toEqual(CUES);
  });

  it("burns nothing in sidecar mode", () => {
    expect(burnedCues(track("sidecar", CUES))).toBeUndefined();
  });

  it("burns nothing without a track or without cues", () => {
    expect(burnedCues(undefined)).toBeUndefined();
    expect(burnedCues(track("burn"))).toBeUndefined();
  });
});

describe("caption style from the theme", () => {
  it("takes the caption size, the semibold weight and the body line height", () => {
    const style = captionStyle(MODERN);
    expect(style.fontSize).toBe(MODERN.typography.scale.caption);
    expect(style.fontWeight).toBe(MODERN.typography.weights.semibold);
    expect(style.lineHeight).toBe(MODERN.typography.lineHeight.body);
    expect(style.fontFamily).toBe(MODERN.typography.fontFamily);
  });

  it("is text on an opaque panel in the theme's declared pair", () => {
    const style = captionStyle(MODERN);
    expect(style.panelOpacity).toBe(1);
    expect(style.textColor).toBe(MODERN.colors.text);
    expect(style.panelColor).toBe(MODERN.colors.background);
    expect(MODERN.contrastPairs).toContainEqual({
      text: "text",
      background: "background",
    });
  });

  it("meets the 4.5:1 contrast rule", () => {
    const style = captionStyle(MODERN);
    expect(
      contrastRatio(style.textColor, style.panelColor),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("meets the 4.5:1 rule over any picture behind the panel", () => {
    const style = captionStyle(MODERN);
    // Backgrounds across the colour cube: every channel in steps of 0x33.
    const steps = [0, 0x33, 0x66, 0x99, 0xcc, 0xff];
    for (const r of steps) {
      for (const g of steps) {
        for (const b of steps) {
          const picture = [r, g, b];
          // Source-over with the panel's opacity: the picture shows through only as far as the panel does.
          const seen = composite(style.panelColor, picture, style.panelOpacity);
          expect(contrastRatio(style.textColor, seen)).toBeGreaterThanOrEqual(
            4.5,
          );
        }
      }
    }
  });
});

/** The colour a panel of `hex` at `opacity` shows over a picture pixel. */
function composite(hex: string, picture: number[], opacity: number): string {
  const channels = [1, 3, 5].map((at, i) => {
    const panel = parseInt(hex.slice(at, at + 2), 16);
    const under = picture[i] ?? 0;
    return Math.round(opacity * panel + (1 - opacity) * under);
  });
  return `#${channels
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

describe("caption placement", () => {
  it("sits at the bottom of the safe area, inside its side margins", () => {
    // 6% of 640 and 8% of 360 for the 16:9 frame, as the safe area places them.
    expect(captionPlacement(MODERN, 640, 360)).toEqual({
      bottom: 29,
      sideMargin: 38,
    });
  });
});
