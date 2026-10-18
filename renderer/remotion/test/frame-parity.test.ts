// Parity between the device frame registry and the renderer (task 040; PRD §10):
// every registry frame has a renderer contract that equals it, and the frame
// drawings use only theme tokens the frames declare.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getFrame, listFrames } from "@quarto-video/registry";
import { frameContract, frameIds } from "../media/frames/tokens.js";

const DRAWINGS = [
  "media/frames/FrameShell.tsx",
  "media/frames/layout.ts",
  "media/FramedScene.tsx",
];

function source(file: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../${file}`, import.meta.url)),
    "utf8",
  );
}

describe("registry and renderer device frames", () => {
  it("draws exactly the frame ids the registry declares", () => {
    expect(frameIds()).toEqual(
      listFrames()
        .map((frame) => frame.id)
        .sort(),
    );
  });

  it("gives the renderer the same contract the registry declares", () => {
    for (const frame of listFrames()) {
      expect(frameContract(frame.id)).toEqual(getFrame(frame.id));
    }
  });

  it("names the known frames when asked for an unknown one", () => {
    expect(() => frameContract("laptop")).toThrow(
      'unknown frame "laptop" (known: browser, generic, phone, tablet)',
    );
  });

  it("draws with theme tokens only: no colour literals in the frame drawings", () => {
    for (const file of DRAWINGS) {
      expect(source(file), file).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(source(file), file).not.toMatch(/\brgba?\(/);
    }
  });

  it("uses only tokens that some registry frame declares", () => {
    const declared = new Set(listFrames().flatMap((frame) => frame.tokens));
    const used = [
      ...source("media/frames/FrameShell.tsx").matchAll(
        /theme\.((?:colors|space|radius)\.\w+)/g,
      ),
    ].map((match) => match[1] ?? "");
    expect(used.length).toBeGreaterThan(0);
    for (const token of used) {
      expect(declared.has(token), token).toBe(true);
    }
  });
});
