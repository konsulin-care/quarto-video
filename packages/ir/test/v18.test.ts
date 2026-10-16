// IR 1.8 (ADR-0009, task 044): a media item may keep its source audio. A `keep`
// item carries a volume, above 0 and at most 1; a `mute` item has none. IR 1.7
// still rejects `keep`, since it is frozen.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateIr } from "../src/validate.js";

type Doc = Record<string, unknown>;

const load = (file: string): Doc =>
  JSON.parse(
    readFileSync(new URL(`../examples/${file}`, import.meta.url), "utf8"),
  );

/** A fresh copy of an example with `edit` applied to its first media item. */
function withMedia(edit: (media: Doc) => void, file = "v1.8.json"): unknown {
  const doc = load(file);
  const scenes = doc["scenes"] as Doc[];
  const media = (scenes[0] as Doc)["media"] as Doc[];
  edit(media[0] as Doc);
  return doc;
}

function errorPaths(json: unknown): string[] {
  const result = validateIr(json);
  return result.ok ? [] : result.errors.map((e) => e.path);
}

describe("IR 1.8 source audio", () => {
  it("accepts examples/v1.8.json, a kept clip at volume 0.5 beside a muted one", () => {
    expect(validateIr(load("v1.8.json"))).toEqual({ ok: true, errors: [] });
  });

  it("accepts a kept item at the top of its range (volume 1)", () => {
    expect(validateIr(withMedia((media) => (media["volume"] = 1)))).toEqual({
      ok: true,
      errors: [],
    });
  });

  it("rejects a kept item with no volume", () => {
    expect(
      errorPaths(withMedia((media) => delete media["volume"])),
    ).not.toEqual([]);
  });

  it("rejects a volume on a muted item", () => {
    const muted = withMedia((media) => (media["audio"] = "mute"));
    expect(errorPaths(muted)).toContain("/scenes/0/media/0/volume");
  });

  it.each([
    ["zero (no sound is mute)", 0],
    ["above 1 (no boosting)", 1.5],
    ["negative", -0.5],
  ])("rejects a volume of %s", (_label, volume) => {
    expect(
      errorPaths(withMedia((media) => (media["volume"] = volume))),
    ).toContain("/scenes/0/media/0/volume");
  });

  it("rejects a volume written as text", () => {
    expect(
      errorPaths(withMedia((media) => (media["volume"] = "0.5"))),
    ).toContain("/scenes/0/media/0/volume");
  });

  it("rejects an audio value other than mute or keep", () => {
    expect(
      errorPaths(withMedia((media) => (media["audio"] = "loud"))),
    ).toContain("/scenes/0/media/0/audio");
  });

  it("rejects keep in IR 1.7, which is frozen", () => {
    const frozen = withMedia((media) => (media["audio"] = "keep"), "v1.7.json");
    expect(errorPaths(frozen)).toContain("/scenes/0/media/0/audio");
  });
});
