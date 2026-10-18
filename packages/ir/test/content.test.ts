// IR 0.2 content nodes and version handling (ADR-0004; PRD §8.2).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { plainText, slotTexts } from "../src/text.js";
import { validateIr } from "../src/validate.js";

const load = (name: string): Record<string, unknown> =>
  JSON.parse(
    readFileSync(new URL(`../examples/${name}`, import.meta.url), "utf8"),
  ) as Record<string, unknown>;

type Doc = { scenes: { content: { slots: Record<string, unknown[]> } }[] };

/** A fresh copy of the 0.2 example with `edit` applied. */
function withEdit(edit: (doc: Doc & Record<string, unknown>) => void): unknown {
  const doc = structuredClone(load("content-nodes.json")) as Doc &
    Record<string, unknown>;
  edit(doc);
  return doc;
}

function paths(json: unknown): string[] {
  const result = validateIr(json);
  return result.ok ? [] : result.errors.map((e) => e.path);
}

const left = (doc: Doc): unknown[] => doc.scenes[0]!.content.slots["left"]!;

describe("IR 0.2 content", () => {
  it("accepts examples/content-nodes.json, which uses every node type", () => {
    expect(validateIr(load("content-nodes.json"))).toEqual({
      ok: true,
      errors: [],
    });
  });

  it("still accepts the IR 0.1 example", () => {
    expect(validateIr(load("minimal.json"))).toEqual({ ok: true, errors: [] });
  });

  it("rejects the 0.1 text field under a 0.2 manifest", () => {
    const json = withEdit(
      (d) => (d.scenes[0]!.content = { text: "Hi" } as never),
    );
    expect(paths(json)).toContain("/scenes/0/content/text");
  });

  it("rejects a manifest with no slots at /scenes/0/content/slots", () => {
    const json = withEdit((d) => (d.scenes[0]!.content.slots = {}));
    expect(paths(json)).toEqual(["/scenes/0/content/slots"]);
  });

  it("rejects an empty slot list at its own slot path", () => {
    const json = withEdit((d) => (d.scenes[0]!.content.slots["left"] = []));
    expect(paths(json)).toEqual(["/scenes/0/content/slots/left"]);
  });

  it("rejects a slot name that is not lowercase at its path", () => {
    const json = withEdit((d) => {
      d.scenes[0]!.content.slots["Left"] = d.scenes[0]!.content.slots["left"]!;
      delete d.scenes[0]!.content.slots["left"];
    });
    expect(paths(json)).toEqual(["/scenes/0/content/slots/Left"]);
  });

  it("rejects an unknown block type", () => {
    const json = withEdit((d) => left(d).push({ type: "table", rows: [] }));
    expect(paths(json).length).toBeGreaterThan(0);
  });

  it("rejects a heading level above 6", () => {
    const json = withEdit((d) =>
      left(d).push({ type: "heading", level: 7, inlines: [] }),
    );
    expect(paths(json).some((p) => p.endsWith("/level"))).toBe(true);
  });

  it("rejects an unknown quote kind", () => {
    const json = withEdit((d) =>
      left(d).push({
        type: "paragraph",
        inlines: [{ type: "quoted", quote: "curly", inlines: [] }],
      }),
    );
    expect(paths(json).some((p) => p.endsWith("/quote"))).toBe(true);
  });

  it("rejects a text node with an empty string", () => {
    const json = withEdit((d) =>
      left(d).push({
        type: "paragraph",
        inlines: [{ type: "text", text: "" }],
      }),
    );
    expect(paths(json).some((p) => p.endsWith("/text"))).toBe(true);
  });

  it("names an unsupported schema version at /schemaVersion", () => {
    const result = validateIr({
      ...load("content-nodes.json"),
      schemaVersion: "0.4",
    });
    expect(result).toEqual({
      ok: false,
      errors: [
        {
          path: "/schemaVersion",
          code: "E_IR_UNSUPPORTED_VERSION",
          message:
            '"0.4" is not a supported IR version; supported versions: 0.1, 0.2, 0.3, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11',
        },
      ],
    });
  });
});

describe("plainText", () => {
  it("reads the text of IR 0.1 content", () => {
    const scene = (load("minimal.json")["scenes"] as { content: never }[])[0]!;
    expect(plainText(scene.content)).toBe("Why GPUs Matter");
  });

  it("joins the default slot's blocks, one per line, and ignores other slots", () => {
    const doc = load("content-nodes.json") as unknown as Doc;
    expect(plainText(doc.scenes[0]!.content as never)).toBe(
      "Why GPUs\ngpu.run()",
    );
  });

  it("flattens nested inlines, quotes and line breaks", () => {
    const content = {
      slots: {
        default: [
          {
            type: "paragraph" as const,
            inlines: [
              {
                type: "strong" as const,
                inlines: [{ type: "text" as const, text: "CPUs" }],
              },
              { type: "text" as const, text: " and " },
              {
                type: "quoted" as const,
                quote: "double" as const,
                inlines: [{ type: "code" as const, text: "gpu" }],
              },
              { type: "line-break" as const },
              { type: "text" as const, text: "next" },
            ],
          },
        ],
      },
    };
    expect(plainText(content)).toBe('CPUs and "gpu"\nnext');
  });

  it("is empty when there is no default slot", () => {
    expect(plainText({ slots: { left: [] as never } })).toBe("");
  });
});

describe("slotTexts", () => {
  it("gives IR 0.1 content its text under default", () => {
    const scene = (load("minimal.json")["scenes"] as { content: never }[])[0]!;
    expect(slotTexts(scene.content)).toEqual({ default: "Why GPUs Matter" });
  });

  it("gives each slot its own lines and leaves out a slot the scene lacks", () => {
    const content = {
      slots: {
        default: [
          {
            type: "heading" as const,
            level: 1,
            inlines: [{ type: "text" as const, text: "Title" }],
          },
        ],
        subtitle: [
          {
            type: "paragraph" as const,
            inlines: [{ type: "text" as const, text: "Subtitle" }],
          },
        ],
      },
    };
    expect(slotTexts(content)).toEqual({
      default: "Title",
      subtitle: "Subtitle",
    });
    expect(slotTexts({ slots: { default: [] as never } })).toEqual({
      default: "",
    });
  });
});
