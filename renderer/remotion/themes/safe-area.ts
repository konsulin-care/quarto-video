// Safe-area margins in pixels for a frame size (PRD §10.2). The theme declares
// margins per aspect ratio; a frame uses the entry whose ratio is nearest.
import type { ThemeTokens } from "@quarto-video/registry";

export interface Margins {
  x: number;
  y: number;
}

/** Pixel margins of a `width` x `height` frame, from the nearest declared ratio. */
export function safeAreaPixels(
  theme: ThemeTokens,
  width: number,
  height: number,
): Margins {
  const target = Math.log(width / height);
  let best: { xPercent: number; yPercent: number } | undefined;
  let bestDistance = Infinity;
  for (const [ratio, area] of Object.entries(theme.safeArea)) {
    const [w = 0, h = 0] = ratio.split(":").map(Number);
    const distance = Math.abs(Math.log(w / h) - target);
    if (distance < bestDistance) {
      best = area;
      bestDistance = distance;
    }
  }
  if (best === undefined) {
    throw new Error(`theme "${theme.id}" declares no safe area`);
  }
  return {
    x: Math.round((width * best.xPercent) / 100),
    y: Math.round((height * best.yPercent) / 100),
  };
}
