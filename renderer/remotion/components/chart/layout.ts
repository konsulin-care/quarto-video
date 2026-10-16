// Plot geometry for bar and line charts (task 035). Positions are in the pixels
// of the chart's svg, so the theme's font sizes apply directly. Pure.
import type { Scale } from "./scale.js";

/** Average glyph width of the theme's sans-serif, in ems. */
const GLYPH_EM = 0.56;

export interface Plot {
  left: number;
  top: number;
  right: number;
  bottom: number;
  /** Width of one category slot. */
  slot: number;
  /** Category labels turn, because flat ones would overlap. */
  rotated: boolean;
  /** Centre x of category `index`. */
  xOf(index: number): number;
  /** y of `value` on the scale: the top is the scale's highest tick. */
  yOf(value: number): number;
}

export interface PlotInput {
  /** The svg's size in pixels. */
  width: number;
  height: number;
  /** The caption size (the theme's caption token), the unit of all spacing. */
  font: number;
  /** Width in pixels of the widest value-axis tick label. */
  tickWidth: number;
  labels: readonly string[];
  scale: Scale;
}

/** The plot rectangle and the mapping of categories and values onto it. */
export function layoutPlot(input: PlotInput): Plot {
  const { width, height, font, tickWidth, labels, scale } = input;
  const count = Math.max(labels.length, 1);
  const longest = Math.max(0, ...labels.map((label) => label.length));
  const labelLength = longest * font * GLYPH_EM;
  const left = tickWidth + font * 0.8;
  const right = width - font * 0.8;
  const flatSlot = (right - left) / count;
  const rotated = labelLength > flatSlot;
  const top = font * 2.6;
  const bottom =
    height - (rotated ? labelLength * 0.6 + font * 1.2 : font * 2.2);
  const slot = flatSlot;
  const span = scale.hi - scale.lo;
  return {
    left,
    top,
    right,
    bottom,
    slot,
    rotated,
    xOf: (index) => left + slot * (index + 0.5),
    yOf: (value) => top + ((scale.hi - value) / span) * (bottom - top),
  };
}
