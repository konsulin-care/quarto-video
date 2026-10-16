// Frame geometry in output pixels (task 040; PRD §10.2): the frame box is the
// largest box of the frame's shape inside the canvas safe area, centred; the
// screen is the frame's safe content box, as percentages of the frame box. Pure:
// the same canvas and frame always give the same boxes.
import type { FrameContract } from "@quarto-video/registry";
import type { Box } from "@quarto-video/registry/layout";

/** A rectangle in output pixels. */
export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The width over the height of an "width:height" aspect. */
export function aspectRatio(aspect: string): number {
  const [width = 0, height = 0] = aspect.split(":").map(Number);
  return width / height;
}

/**
 * The frame box: the largest box of `aspect` that fits `safe`, centred on the
 * canvas, in whole pixels. `safe` is the canvas's safe box (theme safeBox).
 */
export function frameBox(canvas: Box, safe: Box, aspect: string): Rect {
  const { width, height } = frameSize(safe, aspect);
  return {
    left: Math.round((canvas.width - width) / 2),
    top: Math.round((canvas.height - height) / 2),
    width,
    height,
  };
}

/** The largest whole-pixel box of `aspect` that fits `space`. */
function frameSize(space: Box, aspect: string): Box {
  const ratio = aspectRatio(aspect);
  if (space.width / space.height > ratio) {
    const height = Math.floor(space.height);
    return { width: Math.floor(height * ratio), height };
  }
  const width = Math.floor(space.width);
  return { width, height: Math.floor(width / ratio) };
}

/**
 * The frame box centred in `region` (output pixels), the largest of `aspect` that
 * fits it. With a caption band reserved below the frame, the region is the safe
 * area less that band (task 041). For the whole safe area it gives the same box
 * as frameBox.
 */
export function fitFrame(region: Rect, aspect: string): Rect {
  const { width, height } = frameSize(region, aspect);
  return {
    left: region.left + Math.round((region.width - width) / 2),
    top: region.top + Math.round((region.height - height) / 2),
    width,
    height,
  };
}

/** The screen: the frame's safe content box, in pixels relative to the frame box. */
export function screenBox(contract: FrameContract, frame: Rect): Rect {
  const { xPercent, yPercent, widthPercent, heightPercent } = contract.content;
  return {
    left: Math.round((frame.width * xPercent) / 100),
    top: Math.round((frame.height * yPercent) / 100),
    width: Math.round((frame.width * widthPercent) / 100),
    height: Math.round((frame.height * heightPercent) / 100),
  };
}

/** True when `inner` lies inside `outer` (both in the same coordinates). */
export function insideRect(inner: Rect, outer: Rect): boolean {
  return (
    inner.left >= outer.left &&
    inner.top >= outer.top &&
    inner.left + inner.width <= outer.left + outer.width &&
    inner.top + inner.height <= outer.top + outer.height
  );
}
