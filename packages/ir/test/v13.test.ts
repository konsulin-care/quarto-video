// IR 1.3 (ADR-0013): IR 1.2 plus the image block in scene content. Every 1.2
// rule still holds. An image block is checked for shape here; that its file
// exists is stage 3 of the validator (ADR-0006), not the schema.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hasTimeline } from "../src/timeline.js";
import { slotTexts } from "../src/text.js";
import { validateIr } from "../src/validate.js";
import type { IrVideo } from "../src/types.js";

type Doc = Record<string, unknown>;

const load = (file: string): Doc =>
  JSON.parse(
    readFileSync(new URL(`../examples/${file}`, import.meta.url), "utf8"),
  );

/** A fresh copy of the 1.3 example with `edit` applied to its image block. */
function withImage(edit: (block: Doc) => void): unknown {
  const doc = load("v1.3.json");
  const scenes = doc["scenes"] as Doc[];
  const slots = (scenes[0]?.["content"] as Doc)["slots"] as Record<
    string,
    Doc[]
  >;
  edit(slots["default"]?.[0] as Doc);
  return doc;
}

describe("IR 1.3 image block", () => {
  it("accepts examples/v1.3.json, which holds an image and a caption", () => {
    expect(validateIr(load("v1.3.json"))).toEqual({ ok: true, errors: [] });
  });

  it.each(["cover", "contain"])("accepts fit %s", (fit) => {
    expect(validateIr(withImage((block) => (block["fit"] = fit)))).toEqual({
      ok: true,
      errors: [],
    });
  });

  it('accepts alt "" (a decorative image)', () => {
    expect(validateIr(withImage((block) => (block["alt"] = "")))).toEqual({
      ok: true,
      errors: [],
    });
  });

  it.each([
    ["fit", (block: Doc) => (block["fit"] = "stretch")],
    ["alt", (block: Doc) => delete block["alt"]],
    ["src", (block: Doc) => (block["src"] = "")],
    ["src", (block: Doc) => delete block["src"]],
    ["fit", (block: Doc) => delete block["fit"]],
  ])("rejects an image block with a bad %s", (_name, edit) => {
    expect(validateIr(withImage(edit)).ok).toBe(false);
  });

  it("rejects an image block in a 1.2 manifest (1.2 is frozen)", () => {
    const doc = { ...load("v1.3.json"), schemaVersion: "1.2" };
    expect(validateIr(doc).ok).toBe(false);
  });

  it("keeps the timeline of 1.3 manifests", () => {
    expect(hasTimeline(load("v1.3.json") as unknown as IrVideo)).toBe(true);
  });

  it("draws no text for the image block; its caption is the text", () => {
    const content = (load("v1.3.json")["scenes"] as Doc[])[0]?.[
      "content"
    ] as Parameters<typeof slotTexts>[0];
    expect(slotTexts(content)).toEqual({
      default: "",
      caption: "Harbour at dusk",
    });
  });
});
