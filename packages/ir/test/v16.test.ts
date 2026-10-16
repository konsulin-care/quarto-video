// IR 1.6 (task 038): a scene may carry `media`, one `.video` footage item with
// source in and out points in source frames. Source time and timeline time are
// separate fields: a media item never has a timeline field, and the timeline
// never has a source field. Frozen 1.5 manifests still reject `media`.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hasTimeline } from "../src/timeline.js";
import { validateIr } from "../src/validate.js";
import type { IrVideo } from "../src/types.js";

type Doc = Record<string, unknown>;

const load = (file: string): Doc =>
  JSON.parse(
    readFileSync(new URL(`../examples/${file}`, import.meta.url), "utf8"),
  );

/** A fresh copy of v1.6.json with `edit` applied to its media item. */
function withMedia(edit: (media: Doc) => void): unknown {
  const doc = load("v1.6.json");
  const scenes = doc["scenes"] as Doc[];
  const media = (scenes[0] as Doc)["media"] as Doc[];
  edit(media[0] as Doc);
  return doc;
}

function errorPaths(json: unknown): string[] {
  const result = validateIr(json);
  return result.ok ? [] : result.errors.map((e) => e.path);
}

describe("IR 1.6 scene media", () => {
  it("accepts examples/v1.6.json, a background video with a source range", () => {
    expect(validateIr(load("v1.6.json"))).toEqual({ ok: true, errors: [] });
    expect(hasTimeline(load("v1.6.json") as unknown as IrVideo)).toBe(true);
  });

  it("accepts a framed video with a frame style and no source end", () => {
    const json = withMedia((media) => {
      media["placement"] = "framed";
      media["frame"] = "browser";
      delete media["sourceEndFrames"];
    });
    expect(validateIr(json)).toEqual({ ok: true, errors: [] });
  });

  it("rejects a media item with an unknown property", () => {
    const json = withMedia((media) => {
      media["volume"] = 1;
    });
    expect(errorPaths(json)).toEqual(["/scenes/0/media/0/volume"]);
  });

  it("rejects a timeline field on a media item (source time is not timeline time)", () => {
    const json = withMedia((media) => {
      media["startFrame"] = 0;
      media["durationFrames"] = 60;
    });
    expect(errorPaths(json)).toEqual([
      "/scenes/0/media/0/startFrame",
      "/scenes/0/media/0/durationFrames",
    ]);
  });

  it("rejects source frames that are not integers or are negative", () => {
    expect(
      errorPaths(withMedia((media) => (media["sourceStartFrames"] = 1.5))),
    ).toEqual(["/scenes/0/media/0/sourceStartFrames"]);
    expect(
      errorPaths(withMedia((media) => (media["sourceStartFrames"] = -1))),
    ).toEqual(["/scenes/0/media/0/sourceStartFrames"]);
  });

  it("rejects a playback rate that is not a positive number", () => {
    expect(
      errorPaths(withMedia((media) => (media["playbackRate"] = 0))),
    ).toEqual(["/scenes/0/media/0/playbackRate"]);
  });

  it("accepts only the mute audio policy until task 044", () => {
    expect(errorPaths(withMedia((media) => (media["audio"] = "keep")))).toEqual(
      ["/scenes/0/media/0/audio"],
    );
  });

  it("rejects an unknown placement, fit or frame", () => {
    expect(
      errorPaths(withMedia((media) => (media["placement"] = "slot"))),
    ).toEqual(["/scenes/0/media/0/placement"]);
    expect(errorPaths(withMedia((media) => (media["fit"] = "fill")))).toEqual([
      "/scenes/0/media/0/fit",
    ]);
    expect(
      errorPaths(withMedia((media) => (media["frame"] = "laptop"))),
    ).toEqual(["/scenes/0/media/0/frame"]);
  });

  it("rejects an absolute or escaping source path", () => {
    expect(
      errorPaths(withMedia((media) => (media["src"] = "/abs/clip.mp4"))),
    ).toEqual(["/scenes/0/media/0/src"]);
  });

  it("keeps the 1.5 schema unchanged: a 1.5 manifest with media is rejected", () => {
    const doc = load("v1.5.json");
    const scenes = doc["scenes"] as Doc[];
    scenes[0] = {
      ...(scenes[0] as Doc),
      media: (load("v1.6.json")["scenes"] as Doc[])[0]!["media"],
    };
    expect(errorPaths(doc)).toEqual(["/scenes/0/media"]);
  });
});
