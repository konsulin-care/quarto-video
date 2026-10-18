// IR 0.3 timeline (PRD §8.3; ADR-0005): the shared vectors, the schema rules
// for transitions and the timeline section, and version handling.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveTimeline, timelineOf } from "../src/timeline.js";
import { validateIr } from "../src/validate.js";
import type { IrVideo } from "../src/types.js";

type Vector = {
  name: string;
  scenes: { durationFrames: number; transitionFrames?: number }[];
  startFrames: number[];
  durationFrames: number;
};

const vectors = JSON.parse(
  readFileSync(
    new URL("../test-vectors/timeline.json", import.meta.url),
    "utf8",
  ),
) as Vector[];

const example = (): Record<string, unknown> =>
  structuredClone(
    JSON.parse(
      readFileSync(
        new URL("../examples/timeline.json", import.meta.url),
        "utf8",
      ),
    ),
  ) as Record<string, unknown>;

type Doc = {
  scenes: { transition?: Record<string, unknown> }[];
  timeline: {
    durationFrames: number;
    scenes: { id: string; startFrame: number }[];
  };
};

function edited(edit: (doc: Doc & Record<string, unknown>) => void): unknown {
  const doc = example() as Doc & Record<string, unknown>;
  edit(doc);
  return doc;
}

function paths(json: unknown): string[] {
  const result = validateIr(json);
  return result.ok ? [] : result.errors.map((e) => e.path);
}

describe("resolveTimeline vectors", () => {
  it.each(vectors)("$name", (vector) => {
    const scenes = vector.scenes.map((scene, index) => ({
      id: `s${index + 1}`,
      durationFrames: scene.durationFrames,
      ...(scene.transitionFrames === undefined
        ? {}
        : { transition: { durationFrames: scene.transitionFrames } }),
    }));
    const timeline = resolveTimeline(scenes);
    expect(timeline.scenes.map((s) => s.startFrame)).toEqual(
      vector.startFrames,
    );
    expect(timeline.durationFrames).toBe(vector.durationFrames);
  });
});

describe("timelineOf", () => {
  it("returns the timeline section of IR 0.3", () => {
    const ir = example() as unknown as IrVideo;
    expect(timelineOf(ir)).toEqual({
      durationFrames: 300,
      scenes: [
        { id: "scene-001", startFrame: 0 },
        { id: "scene-002", startFrame: 90 },
        { id: "scene-003", startFrame: 180 },
      ],
    });
  });

  it("resolves IR 0.2 without transitions as a sequential timeline", () => {
    const ir = JSON.parse(
      readFileSync(
        new URL("../examples/content-nodes.json", import.meta.url),
        "utf8",
      ),
    ) as IrVideo;
    const timeline = timelineOf(ir);
    const frames = ir.scenes.reduce((sum, s) => sum + s.durationFrames, 0);
    expect(timeline.durationFrames).toBe(frames);
  });
});

describe("IR 0.3 schema", () => {
  it("accepts examples/timeline.json, which has a fade overlap", () => {
    expect(validateIr(example())).toEqual({ ok: true, errors: [] });
  });

  it("requires the timeline section", () => {
    const doc = example();
    delete doc["timeline"];
    expect(paths(doc)).toEqual(["/timeline"]);
  });

  it("rejects a negative transition length", () => {
    const json = edited((doc) => {
      doc.scenes[1]!.transition = { name: "fade", durationFrames: -1 };
    });
    expect(paths(json)).toEqual(["/scenes/1/transition/durationFrames"]);
  });

  it("rejects an unknown key in a transition", () => {
    const json = edited((doc) => {
      doc.scenes[1]!.transition = {
        name: "fade",
        durationFrames: 30,
        easing: "in",
      };
    });
    expect(paths(json)).toEqual(["/scenes/1/transition/easing"]);
  });

  it("rejects a fractional start frame", () => {
    const json = edited((doc) => {
      doc.timeline.scenes[1]!.startFrame = 90.5;
    });
    expect(paths(json)).toEqual(["/timeline/scenes/1/startFrame"]);
  });

  it("names IR 0.4 as unsupported, with the supported versions", () => {
    const result = validateIr({ ...example(), schemaVersion: "0.4" });
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
