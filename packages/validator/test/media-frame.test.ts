// Stage 2 frame check for framed `.video` blocks (task 040; PRD §5.5): a frame
// name must be registered, and the message lists the registered frames. The
// IR 1.6 frame enum (frozen) must list the same names as the registry.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { FrameContract } from "@quarto-video/registry";
import { describe, expect, it } from "vitest";
import { listFrames } from "@quarto-video/registry";
import { checkMediaFrames } from "../src/stages/media-frame.js";
import { checkManifest } from "../src/run.js";

const FRAMES: FrameContract[] = ["browser", "generic", "phone", "tablet"].map(
  (id) => ({
    id,
    version: "1.0.0",
    purpose: "Test frame.",
    aspect: "16:9",
    content: {
      xPercent: 0,
      yPercent: 0,
      widthPercent: 100,
      heightPercent: 100,
    },
    tokens: ["colors.surface"],
  }),
);

/** A raw manifest with one scene holding one `.video` block of `placement` and `frame`. */
function manifest(media: Record<string, unknown>) {
  return {
    scenes: [
      {
        id: "intro",
        component: "statement",
        source: { file: "index.qmd", line: 6 },
        media: [{ type: "video", placement: "framed", ...media }],
      },
    ],
  };
}

/** The enum of the first `frame` property found in a schema object, if any. */
function frameEnumOf(node: unknown): string[] | undefined {
  if (typeof node !== "object" || node === null) return undefined;
  const record = node as Record<string, unknown>;
  const frame = (record["properties"] as Record<string, unknown> | undefined)?.[
    "frame"
  ] as { enum?: string[] } | undefined;
  if (frame?.enum !== undefined) return frame.enum;
  for (const child of Object.values(record)) {
    const found = frameEnumOf(child);
    if (found !== undefined) return found;
  }
  return undefined;
}

describe("device frame names", () => {
  it("accepts a registered frame", () => {
    expect(
      checkMediaFrames(manifest({ frame: "phone" }), "x.json", FRAMES),
    ).toEqual([]);
  });

  it("reports an unknown frame with the registered ones, at the scene's line", () => {
    const found = checkMediaFrames(
      manifest({ frame: "laptop" }),
      "x.json",
      FRAMES,
    );
    expect(found).toEqual([
      {
        severity: "error",
        code: "E_MEDIA_FRAME",
        message: 'Unknown frame "laptop" on a framed video block.',
        file: "index.qmd",
        line: 6,
        sceneId: "intro",
        property: "frame",
        suggestion: "Registered frames: browser, generic, phone, tablet.",
      },
    ]);
  });

  it("skips background footage and a missing frame (the Lua filter and schema report those)", () => {
    const background = manifest({ placement: "background", frame: "laptop" });
    expect(checkMediaFrames(background, "x.json", FRAMES)).toEqual([]);
    expect(checkMediaFrames(manifest({}), "x.json", FRAMES)).toEqual([]);
  });

  it("ignores manifests that are not shaped like scenes", () => {
    expect(checkMediaFrames("text", "x.json", FRAMES)).toEqual([]);
    expect(checkMediaFrames({ scenes: [null, 3] }, "x.json", FRAMES)).toEqual(
      [],
    );
  });

  it("stops the run before the schema: an unknown frame is E_MEDIA_FRAME, not E_IR_SCHEMA", () => {
    const { diagnostics } = checkManifest(
      manifest({ frame: "laptop" }),
      "x.json",
      [],
      [],
      undefined,
      [],
      FRAMES,
    );
    expect(diagnostics.map((d) => d.code)).toEqual(["E_MEDIA_FRAME"]);
  });

  it("the IR 1.6 frame enum lists exactly the registered frames", () => {
    const schema: unknown = JSON.parse(
      readFileSync(
        fileURLToPath(new URL("../../ir/schema/ir-1.6.json", import.meta.url)),
        "utf8",
      ),
    );
    const names = frameEnumOf(schema);
    expect(names).toBeDefined();
    expect([...(names ?? [])].sort()).toEqual(
      listFrames()
        .map((frame) => frame.id)
        .sort(),
    );
  });
});
