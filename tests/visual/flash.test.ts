// The flash-rate check itself (task 023): the luminance of a frame, and the
// one-second window rule, on synthetic sequences. The shipped presets are
// checked by flash-presets.test.ts.
import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import {
  FLASH_THRESHOLD,
  MAX_FLASHES_PER_SECOND,
  flashFrames,
  fullFrameLuma,
  maxFlashesPerSecond,
} from "./flash.js";
import type { Rgb } from "./png.js";

const FPS = 30;

/** A solid frame of one colour, 2x2 pixels. */
function solid(r: number, g: number, b: number): Rgb {
  const data = Buffer.alloc(2 * 2 * 3);
  for (let i = 0; i < data.length; i += 3) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
  return { width: 2, height: 2, data };
}

describe("full-frame luminance", () => {
  it("is 0 for black, 1 for white, and Rec. 709 weighted for red", () => {
    assert.equal(fullFrameLuma(solid(0, 0, 0)), 0);
    assert.ok(Math.abs(fullFrameLuma(solid(255, 255, 255)) - 1) < 1e-9);
    assert.ok(Math.abs(fullFrameLuma(solid(255, 0, 0)) - 0.2126) < 1e-9);
  });
});

describe("flash-rate rule", () => {
  it("allows a slow fade: no frame changes by more than the threshold", () => {
    // 30 frames from black to white: 1/29 per frame, far below 10%.
    const lumas = Array.from({ length: 30 }, (_, i) => i / 29);
    assert.deepEqual(flashFrames(lumas), []);
    assert.equal(maxFlashesPerSecond(lumas, FPS), 0);
  });

  it("counts one cut as one flash", () => {
    const lumas = [...Array(10).fill(0), ...Array(10).fill(1)];
    assert.deepEqual(flashFrames(lumas), [10]);
    assert.equal(maxFlashesPerSecond(lumas, FPS), 1);
  });

  it("fails a strobe: a flash on every frame is 30 per second", () => {
    const lumas = Array.from({ length: 60 }, (_, i) => (i % 2 === 0 ? 0 : 1));
    assert.equal(maxFlashesPerSecond(lumas, FPS), FPS);
    assert.ok(maxFlashesPerSecond(lumas, FPS) > MAX_FLASHES_PER_SECOND);
  });

  it("allows exactly three flashes in one second and rejects four", () => {
    const flashAt = (frames: number[]) => {
      const lumas = Array(FPS * 2).fill(0);
      for (const f of frames)
        for (let i = f; i < lumas.length; i += 1)
          lumas[i] = lumas[i] === 0 ? 1 : 0;
      return lumas;
    };
    assert.equal(maxFlashesPerSecond(flashAt([2, 10, 20]), FPS), 3);
    assert.equal(maxFlashesPerSecond(flashAt([2, 10, 20, 25]), FPS), 4);
  });

  it("measures the window, not the whole clip: spread flashes pass", () => {
    // One flash per second for ten seconds.
    const lumas = Array(FPS * 10).fill(0);
    for (let s = 0; s < 10; s += 1) {
      for (let i = s * FPS + 5; i < lumas.length; i += 1)
        lumas[i] = lumas[i] === 0 ? 1 : 0;
    }
    assert.equal(maxFlashesPerSecond(lumas, FPS), 1);
  });

  it("treats a change equal to the threshold as no flash", () => {
    assert.deepEqual(flashFrames([0, FLASH_THRESHOLD]), []);
    assert.deepEqual(flashFrames([0, FLASH_THRESHOLD + 0.01]), [1]);
  });
});
