// IR 1.9 (ADR-0017, task 045): an optional top-level music track. The track
// needs a file, a volume above 0 and at most 1, and a loop flag; the fade and the
// length are optional frame counts. IR 1.8 still rejects `music`, since it is frozen.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateIr } from "../src/validate.js";

type Doc = Record<string, unknown>;

const load = (file: string): Doc =>
  JSON.parse(
    readFileSync(new URL(`../examples/${file}`, import.meta.url), "utf8"),
  );

/** A fresh copy of the 1.9 example with `edit` applied to its music track. */
function withMusic(edit: (music: Doc) => void, file = "v1.9.json"): unknown {
  const doc = load(file);
  edit(doc["music"] as Doc);
  return doc;
}

function errorPaths(json: unknown): string[] {
  const result = validateIr(json);
  return result.ok ? [] : result.errors.map((e) => e.path);
}

describe("IR 1.9 project music", () => {
  it("accepts examples/v1.9.json: a looped track at 0.5 with a fade and a length", () => {
    expect(validateIr(load("v1.9.json"))).toEqual({ ok: true, errors: [] });
  });

  it("accepts the filter's form: no fade and no length yet", () => {
    const doc = load("v1.9.json");
    delete (doc["music"] as Doc)["fadeOutFrames"];
    delete (doc["music"] as Doc)["lengthFrames"];
    expect(validateIr(doc)).toEqual({ ok: true, errors: [] });
  });

  it("accepts a manifest with no music track", () => {
    const doc = load("v1.9.json");
    delete doc["music"];
    expect(validateIr(doc)).toEqual({ ok: true, errors: [] });
  });

  it.each(["src", "volume", "loop"])("rejects a track with no %s", (key) => {
    expect(errorPaths(withMusic((music) => delete music[key]))).not.toEqual([]);
  });

  it.each([
    ["zero (no sound is no track)", 0],
    ["above 1 (no boosting)", 1.5],
    ["negative", -0.5],
  ])("rejects a volume of %s", (_label, volume) => {
    expect(
      errorPaths(withMusic((music) => (music["volume"] = volume))),
    ).toContain("/music/volume");
  });

  it("accepts a volume of exactly 1", () => {
    expect(validateIr(withMusic((music) => (music["volume"] = 1)))).toEqual({
      ok: true,
      errors: [],
    });
  });

  it("rejects a volume written as text", () => {
    expect(
      errorPaths(withMusic((music) => (music["volume"] = "0.5"))),
    ).toContain("/music/volume");
  });

  it("rejects a loop that is not a boolean", () => {
    expect(
      errorPaths(withMusic((music) => (music["loop"] = "true"))),
    ).toContain("/music/loop");
  });

  it.each(["fadeOutFrames", "lengthFrames"])(
    "rejects %s below one frame",
    (key) => {
      expect(errorPaths(withMusic((music) => (music[key] = 0)))).toContain(
        `/music/${key}`,
      );
    },
  );

  it("rejects an absolute src (ADR-0006)", () => {
    expect(
      errorPaths(withMusic((music) => (music["src"] = "/etc/music.wav"))),
    ).toContain("/music/src");
  });

  it("rejects a key the schema does not know", () => {
    expect(errorPaths(withMusic((music) => (music["gain"] = 0.5)))).toContain(
      "/music/gain",
    );
  });

  it("rejects music in IR 1.8, which is frozen", () => {
    const frozen = load("v1.8.json");
    frozen["music"] = { src: "assets/music.wav", volume: 1, loop: false };
    expect(errorPaths(frozen)).toContain("/music");
  });
});
