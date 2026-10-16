// IR 1.7 (ADR-0016, task 043): a media item may be region footage, placed in a
// named region of its scene. The region is an identifier; a region item has no
// frame, and no other placement has a region. IR 1.6 still rejects `region`.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateIr } from "../src/validate.js";

type Doc = Record<string, unknown>;

const load = (file: string): Doc =>
  JSON.parse(
    readFileSync(new URL(`../examples/${file}`, import.meta.url), "utf8"),
  );

/** A fresh copy of an example with `edit` applied to its first media item. */
function withMedia(edit: (media: Doc) => void, file = "v1.7.json"): unknown {
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

/**
 * The schema reports the failing property and the conditional around it (the
 * "then" or "else" branch), so the property must be among the errors.
 */
function expectRejectedAt(json: unknown, path: string): void {
  expect(errorPaths(json)).toContain(path);
}

describe("IR 1.7 region footage", () => {
  it("accepts examples/v1.7.json, two region videos in one scene", () => {
    expect(validateIr(load("v1.7.json"))).toEqual({ ok: true, errors: [] });
  });

  it("rejects a region item with no region name", () => {
    expectRejectedAt(
      withMedia((media) => delete media["region"]),
      "/scenes/0/media/0/region",
    );
  });

  it("rejects a region name that is not an identifier", () => {
    expect(
      errorPaths(withMedia((media) => (media["region"] = "Left!"))),
    ).toEqual(["/scenes/0/media/0/region"]);
  });

  it("rejects a frame on a region item", () => {
    expectRejectedAt(
      withMedia((media) => (media["frame"] = "browser")),
      "/scenes/0/media/0/frame",
    );
  });

  it("rejects a region name on a background item", () => {
    expectRejectedAt(
      withMedia((media) => (media["placement"] = "background")),
      "/scenes/0/media/0/region",
    );
  });

  it("rejects a slot name used as a placement (only region is a placement)", () => {
    expectRejectedAt(
      withMedia((media) => (media["placement"] = "left")),
      "/scenes/0/media/0/placement",
    );
  });

  it("rejects region placement in IR 1.6, which is frozen", () => {
    const frozen = withMedia((media) => {
      media["placement"] = "region";
      media["region"] = "left";
    }, "v1.6.json");
    expectRejectedAt(frozen, "/scenes/0/media/0/placement");
    expectRejectedAt(frozen, "/scenes/0/media/0/region");
  });
});
