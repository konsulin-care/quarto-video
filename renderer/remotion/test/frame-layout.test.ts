// Frame geometry (task 040; PRD §6.1, §10.2): every registered frame sits inside
// the canvas safe area and keeps its shape, and its screen lies inside the frame,
// so footage is clipped to a box that is always inside the frame.
import { describe, expect, it } from "vitest";
import { getFrame, getTheme, listFrames } from "@quarto-video/registry";
import { safeAreaPixels, safeBox } from "@quarto-video/registry/layout";
import { frameBox, insideRect, screenBox } from "../media/frames/layout.js";

const CANVASES = [
  { width: 640, height: 360 },
  { width: 1920, height: 1080 },
  { width: 360, height: 640 },
  { width: 640, height: 480 },
];

describe("device frame geometry", () => {
  const theme = getTheme("modern");

  for (const canvas of CANVASES) {
    const { width, height } = canvas;
    const margin = safeAreaPixels(theme, width, height);
    const safe = {
      ...safeBox(theme, width, height),
      left: margin.x,
      top: margin.y,
    };
    const label = `${width}x${height}`;
    for (const contract of listFrames()) {
      const id = contract.id;
      it(`${id} on ${label} sits inside the safe area`, () => {
        const box = frameBox(
          canvas,
          safeBox(theme, width, height),
          contract.aspect,
        );
        expect(
          insideRect(box, { ...safe, left: safe.left, top: safe.top }),
        ).toBe(true);
      });

      it(`${id} on ${label} keeps its aspect ratio to within 2%`, () => {
        const box = frameBox(
          canvas,
          safeBox(theme, width, height),
          contract.aspect,
        );
        const [w = 0, h = 0] = contract.aspect.split(":").map(Number);
        expect(Math.abs(box.width / box.height - w / h)).toBeLessThan(0.02);
      });

      it(`${id} on ${label} keeps its screen inside the frame`, () => {
        const box = frameBox(
          canvas,
          safeBox(theme, width, height),
          contract.aspect,
        );
        const screen = screenBox(getFrame(id), box);
        const frame = { left: 0, top: 0, width: box.width, height: box.height };
        expect(insideRect(screen, frame)).toBe(true);
        expect(screen.width).toBeGreaterThan(0);
        expect(screen.height).toBeGreaterThan(0);
      });
    }
  }
});
