// IR 1.11 (ADR-0019, task 046): an optional top-level `captions` track: a WebVTT
// file, a mode (burn, sidecar or both) and the cues in frames, written by the
// validator. IR 1.10 still rejects `captions`, since it is frozen.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateIr } from "../src/validate.js";

type Doc = Record<string, unknown>;

const load = (file: string): Doc =>
  JSON.parse(
    readFileSync(new URL(`../examples/${file}`, import.meta.url), "utf8"),
  );

/** A fresh copy of the 1.11 example with `edit` applied to its captions. */
function withCaptions(edit: (captions: Doc) => void): unknown {
  const doc = load("v1.11.json");
  edit(doc["captions"] as Doc);
  return doc;
}

function errorPaths(json: unknown): string[] {
  const result = validateIr(json);
  return result.ok ? [] : result.errors.map((e) => e.path);
}

describe("IR 1.11 project captions", () => {
  it("accepts examples/v1.11.json: a both-mode track with one cue", () => {
    expect(validateIr(load("v1.11.json"))).toEqual({ ok: true, errors: [] });
  });

  it("accepts the filter's form: no cues yet", () => {
    const doc = load("v1.11.json");
    delete (doc["captions"] as Doc)["cues"];
    expect(validateIr(doc)).toEqual({ ok: true, errors: [] });
  });

  it("accepts a manifest with no captions", () => {
    const doc = load("v1.11.json");
    delete doc["captions"];
    expect(validateIr(doc)).toEqual({ ok: true, errors: [] });
  });

  it.each(["burn", "sidecar", "both"])("accepts mode %s", (mode) => {
    expect(validateIr(withCaptions((c) => (c["mode"] = mode)))).toEqual({
      ok: true,
      errors: [],
    });
  });

  it.each([
    ["an unknown mode", "subtitles"],
    ["a mode that is not text", true],
  ])("rejects %s", (_label, mode) => {
    expect(errorPaths(withCaptions((c) => (c["mode"] = mode)))).toContain(
      "/captions/mode",
    );
  });

  it.each(["src", "mode"])("rejects captions with no %s", (key) => {
    expect(errorPaths(withCaptions((c) => delete c[key]))).not.toEqual([]);
  });

  it("rejects an absolute source path", () => {
    expect(
      errorPaths(withCaptions((c) => (c["src"] = "/abs/captions.vtt"))),
    ).toContain("/captions/src");
  });

  it.each([
    ["a negative start", { startFrame: -1 }],
    ["an end below one frame", { endFrame: 0 }],
    ["an empty text", { text: "" }],
    ["a fractional frame", { startFrame: 1.5 }],
  ])("rejects a cue with %s", (_label, change) => {
    const paths = errorPaths(
      withCaptions((c) => {
        const cue = (c["cues"] as Doc[])[0] as Doc;
        Object.assign(cue, change);
      }),
    );
    expect(paths.some((path) => path.startsWith("/captions/cues/0"))).toBe(
      true,
    );
  });

  it("rejects an unknown key in a cue", () => {
    expect(
      errorPaths(
        withCaptions((c) => {
          const cue = (c["cues"] as Doc[])[0] as Doc;
          cue["style"] = "bold";
        }),
      ),
    ).toContain("/captions/cues/0/style");
  });

  it("rejects captions in IR 1.10, which is frozen", () => {
    const doc = load("v1.10.json");
    doc["captions"] = load("v1.11.json")["captions"];
    expect(errorPaths(doc)).toContain("/captions");
  });
});
