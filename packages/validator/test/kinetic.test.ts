// The kinetic fallback warning (PRD §5.6; task 026): a statement with more than
// KINETIC_MAX_WORDS words is still valid, with one W_ANIMATION_FALLBACK warning
// on its scene. Uses the 1.1 example, with its first scene made a statement.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkManifest } from "../src/index.js";

const statement = (text: string): Record<string, unknown> => {
  const doc = JSON.parse(
    readFileSync(
      new URL("../../ir/examples/v1.1.json", import.meta.url),
      "utf8",
    ),
  ) as Record<string, unknown>;
  const first = (doc["scenes"] as Record<string, unknown>[])[0] as Record<
    string,
    unknown
  >;
  first["component"] = "statement";
  first["animation"] = { name: "kinetic" };
  first["content"] = {
    slots: {
      default: [{ type: "paragraph", inlines: [{ type: "text", text }] }],
    },
  };
  return doc;
};

const words = (n: number) => Array.from({ length: n }, () => "word").join(" ");

describe("kinetic word limit", () => {
  it("passes a statement of up to the limit with no diagnostics", () => {
    const result = checkManifest(statement(words(12)), "index.qmd");
    expect(result.diagnostics).toEqual([]);
    expect(result.ir).not.toBeNull();
  });

  it("warns W_ANIMATION_FALLBACK for a 40-word statement and still passes", () => {
    const result = checkManifest(statement(words(40)), "index.qmd");
    expect(result.ir).not.toBeNull();
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        severity: "warning",
        code: "W_ANIMATION_FALLBACK",
        sceneId: "scene-001",
        component: "statement",
        property: "animation",
        line: 5,
        message:
          'Scene "scene-001" has 40 words; "kinetic" shows at most 12 word by word, so it is drawn with "fade-in".',
      }),
    ]);
  });

  it("counts the words of text-overlay when default is empty (task 039)", () => {
    const doc = statement(words(40));
    const scene = (doc["scenes"] as Record<string, unknown>[])[0] as Record<
      string,
      unknown
    >;
    const content = scene["content"] as { slots: Record<string, unknown> };
    content.slots = { "text-overlay": content.slots["default"] };
    const result = checkManifest(doc, "index.qmd");
    expect(result.diagnostics.map((d) => d.code)).toEqual([
      "W_ANIMATION_FALLBACK",
    ]);
  });

  it("does not warn for other presets, whatever the word count", () => {
    const doc = statement(words(40));
    const first = (doc["scenes"] as Record<string, unknown>[])[0] as Record<
      string,
      unknown
    >;
    first["animation"] = { name: "fade-in" };
    expect(checkManifest(doc, "index.qmd").diagnostics).toEqual([]);
  });
});
