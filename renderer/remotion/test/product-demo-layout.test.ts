// The product-demo caption band (task 041; PRD §10.2): with a caption, the frame
// sits above the band and the band sits in the safe area, so the caption never
// overlaps the frame. A longer caption takes a taller band. Without a caption the
// frame is the one frameBox gives.
import { describe, expect, it } from "vitest";
import { getTheme, listFrames } from "@quarto-video/registry";
import { safeAreaPixels, safeBox } from "@quarto-video/registry/layout";
import { captionBand } from "../media/frames/caption.js";
import { fitFrame, frameBox, insideRect } from "../media/frames/layout.js";

const CANVASES = [
  { width: 640, height: 360 },
  { width: 1920, height: 1080 },
  { width: 360, height: 640 },
  { width: 640, height: 480 },
];

const CAPTIONS = [
  "A short caption.",
  "A caption long enough to wrap onto several lines at this width, so the band grows with it and the frame stays above it.",
];

describe("product-demo caption band", () => {
  const theme = getTheme("modern");

  for (const canvas of CANVASES) {
    const { width, height } = canvas;
    const margin = safeAreaPixels(theme, width, height);
    const size = safeBox(theme, width, height);
    const safe = { left: margin.x, top: margin.y, ...size };
    const label = `${width}x${height}`;

    for (const caption of CAPTIONS) {
      const band = captionBand(theme, caption, safe.width);
      const bandTop = safe.top + safe.height - band;
      const region = { ...safe, height: safe.height - band };
      const words = caption.split(" ").length;

      it(`a ${words}-word caption's band is inside the safe area on ${label}`, () => {
        const strip = {
          left: safe.left,
          top: bandTop,
          width: safe.width,
          height: band,
        };
        expect(insideRect(strip, safe)).toBe(true);
      });

      for (const contract of listFrames()) {
        const id = contract.id;
        it(`${id} with a ${words}-word caption ends above its band on ${label}`, () => {
          const box = fitFrame(region, contract.aspect);
          expect(box.top + box.height).toBeLessThanOrEqual(bandTop);
          expect(insideRect(box, safe)).toBe(true);
        });
      }
    }

    it(`a longer caption takes a taller band on ${label}`, () => {
      expect(captionBand(theme, CAPTIONS[1] ?? "", safe.width)).toBeGreaterThan(
        captionBand(theme, CAPTIONS[0] ?? "", safe.width),
      );
    });

    for (const contract of listFrames()) {
      it(`${contract.id} without a caption fills the safe area as frameBox does on ${label}`, () => {
        expect(fitFrame(safe, contract.aspect)).toEqual(
          frameBox({ width, height }, size, contract.aspect),
        );
      });
    }
  }
});
