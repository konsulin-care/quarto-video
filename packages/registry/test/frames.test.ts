// The device frame registry (PRD §5.5, §6.1; task 040): the four shipped frames,
// the rules that reject a bad frame file, and the theme tokens each one names.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  getFrame,
  listFrames,
  listThemes,
  loadFrameDir,
  parseFrame,
  RegistryError,
} from "../src/index.js";

const SCRATCH = mkdtempSync(join(tmpdir(), "registry-frames-"));
afterAll(() => rmSync(SCRATCH, { recursive: true, force: true }));

const BASE = {
  id: "sample",
  version: "1.0.0",
  purpose: "A sample frame.",
  aspect: "16:9",
  content: { xPercent: 2, yPercent: 2, widthPercent: 96, heightPercent: 96 },
  tokens: ["colors.surface"],
};
const text = (patch: Record<string, unknown>) =>
  JSON.stringify({ ...BASE, ...patch });

/** The value of a dotted token path in the theme, or undefined. */
function tokenValue(theme: object, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        typeof node === "object" && node !== null
          ? (node as Record<string, unknown>)[key]
          : undefined,
      theme,
    );
}

describe("device frames", () => {
  it("lists browser, generic, phone and tablet, sorted", () => {
    expect(listFrames().map((frame) => frame.id)).toEqual([
      "browser",
      "generic",
      "phone",
      "tablet",
    ]);
  });

  it("gives each frame an aspect and a content box inside the frame", () => {
    for (const frame of listFrames()) {
      expect(frame.aspect).toMatch(/^[1-9][0-9]*:[1-9][0-9]*$/);
      const { xPercent, yPercent, widthPercent, heightPercent } = frame.content;
      expect(xPercent + widthPercent).toBeLessThanOrEqual(100);
      expect(yPercent + heightPercent).toBeLessThanOrEqual(100);
    }
  });

  it("names only theme tokens that exist in every theme", () => {
    for (const frame of listFrames()) {
      for (const theme of listThemes()) {
        for (const token of frame.tokens) {
          expect(
            tokenValue(theme, token),
            `${frame.id} ${token} in ${theme.id}`,
          ).toBeDefined();
        }
      }
    }
  });

  it("names the registered frames when asked for an unknown one", () => {
    expect(() => getFrame("laptop")).toThrow(
      'unknown frame "laptop" (known: browser, generic, phone, tablet)',
    );
  });

  it("returns a copy: changing it does not change the registry", () => {
    getFrame("phone").tokens.push("colors.text");
    expect(getFrame("phone").tokens).not.toContain("colors.text");
  });

  it("parses a valid frame", () => {
    expect(parseFrame(text({}), "sample.json").id).toBe("sample");
  });

  it("rejects an unknown field, naming it", () => {
    expect(() => parseFrame(text({ pixels: 4 }), "sample.json")).toThrow(
      /"pixels"/,
    );
  });

  it("rejects an id that does not match the file name", () => {
    expect(() => parseFrame(text({ id: "other" }), "sample.json")).toThrow(
      /must match the file name/,
    );
  });

  it("rejects a content box that leaves the frame", () => {
    const content = {
      xPercent: 50,
      yPercent: 0,
      widthPercent: 60,
      heightPercent: 50,
    };
    expect(() => parseFrame(text({ content }), "sample.json")).toThrow(
      /content box leaves the frame/,
    );
  });

  it("rejects a content box with no width", () => {
    const content = {
      xPercent: 0,
      yPercent: 0,
      widthPercent: 0,
      heightPercent: 50,
    };
    expect(() => parseFrame(text({ content }), "sample.json")).toThrow(
      RegistryError,
    );
  });

  it("rejects an aspect that is not width:height", () => {
    expect(() => parseFrame(text({ aspect: "wide" }), "sample.json")).toThrow(
      /aspect/,
    );
  });

  it("rejects a token outside colors, space and radius", () => {
    expect(() =>
      parseFrame(text({ tokens: ["typography.scale.body"] }), "sample.json"),
    ).toThrow(/tokens/);
  });

  it("rejects a directory entry that is not an <id>.json file", () => {
    const dir = mkdtempSync(join(SCRATCH, "d-"));
    writeFileSync(join(dir, "notes.txt"), "not a frame");
    expect(() => loadFrameDir(dir)).toThrow(/only <id>.json frame files/);
  });
});
