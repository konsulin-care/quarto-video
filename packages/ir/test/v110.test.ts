// IR 1.10 (ADR-0018, tasks 041 and 042 follow-up): a media item has a `kind`, and
// an image is a framed still with no source range, audio or playback settings.
// Video items are as in 1.9. IR 1.9 still rejects `kind`, since it is frozen.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateIr } from "../src/validate.js";

type Doc = Record<string, unknown>;

const load = (file: string): Doc =>
  JSON.parse(
    readFileSync(new URL(`../examples/${file}`, import.meta.url), "utf8"),
  );

/** The example's image item (scene 4, the product-demo still). */
const IMAGE = "/scenes/3/media/0";

/** A fresh copy of the 1.10 example with `edit` applied to its image item. */
function withImage(edit: (item: Doc) => void): unknown {
  const doc = load("v1.10.json");
  const scenes = doc["scenes"] as Doc[];
  const media = (scenes[3] as Doc)["media"] as Doc[];
  edit(media[0] as Doc);
  return doc;
}

function errorPaths(json: unknown): string[] {
  const result = validateIr(json);
  return result.ok ? [] : result.errors.map((e) => e.path);
}

describe("IR 1.10 framed image footage", () => {
  it("accepts examples/v1.10.json: video items and a framed image", () => {
    expect(validateIr(load("v1.10.json"))).toEqual({ ok: true, errors: [] });
  });

  it("accepts a framed image with fit contain and any frame", () => {
    for (const frame of ["browser", "phone", "tablet", "generic"]) {
      for (const fit of ["cover", "contain"]) {
        const doc = withImage((item) => {
          item["frame"] = frame;
          item["fit"] = fit;
        });
        expect(validateIr(doc)).toEqual({ ok: true, errors: [] });
      }
    }
  });

  it("accepts a video item with kind video in the same manifest", () => {
    expect(validateIr(load("v1.10.json"))).toEqual({ ok: true, errors: [] });
    const doc = load("v1.10.json");
    const video = ((doc["scenes"] as Doc[])[0] as Doc)["media"] as Doc[];
    expect(video[0]?.["kind"]).toBe("video");
  });

  it("rejects an image with background placement", () => {
    const doc = withImage((item) => {
      item["placement"] = "background";
    });
    expect(errorPaths(doc)).toContain(`${IMAGE}/placement`);
  });

  it("rejects an image with region placement", () => {
    const doc = withImage((item) => {
      item["placement"] = "region";
      item["region"] = "left";
    });
    expect(errorPaths(doc).some((p) => p.startsWith(IMAGE))).toBe(true);
  });

  it.each([
    ["sourceStartFrames", 0],
    ["sourceEndFrames", 30],
    ["audio", "mute"],
    ["loop", true],
    ["freeze", false],
    ["playbackRate", 1],
    ["volume", 0.5],
    ["region", "left"],
  ])("rejects an image with the video-only field %s", (field, value) => {
    const doc = withImage((item) => {
      item[field] = value;
    });
    expect(errorPaths(doc)).toContain(`${IMAGE}/${field}`);
  });

  it("rejects an image without a frame", () => {
    const doc = withImage((item) => {
      delete item["frame"];
    });
    expect(errorPaths(doc)).toContain(`${IMAGE}/frame`);
  });

  it("rejects a media item without kind", () => {
    const doc = withImage((item) => {
      delete item["kind"];
    });
    expect(errorPaths(doc)).toContain(`${IMAGE}/kind`);
  });

  it("rejects an unknown kind", () => {
    const doc = withImage((item) => {
      item["kind"] = "gif";
    });
    expect(errorPaths(doc)).toContain(`${IMAGE}/kind`);
  });

  it("rejects a video item (kind video) without its source range and audio", () => {
    const doc = load("v1.10.json");
    const video = ((doc["scenes"] as Doc[])[0] as Doc)["media"] as Doc[];
    delete video[0]?.["audio"];
    expect(errorPaths(doc)).toContain("/scenes/0/media/0/audio");
  });

  it("rejects kind on IR 1.9, which is frozen", () => {
    const doc = load("v1.9.json");
    const media = ((doc["scenes"] as Doc[])[0] as Doc)["media"] as Doc[];
    media[0]!["kind"] = "video";
    expect(errorPaths(doc)).toContain("/scenes/0/media/0/kind");
  });
});
