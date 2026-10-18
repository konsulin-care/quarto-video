// `mediaKinds` (ADR-0018): the footage kinds a component takes. Absent means video
// only. An image is framed, so "image" needs the "framed" placement. Product-demo
// and text-media take both kinds; the other footage components are unchanged.
import { describe, expect, it } from "vitest";
import { getComponent, parseContract, RegistryError } from "../src/index.js";

/** A valid contract with `extra` fields added; tests change one field at a time. */
function contract(extra: Record<string, unknown>): string {
  return JSON.stringify({
    id: "sample",
    version: "1.0.0",
    purpose: "A sample component used by the media kind tests.",
    slots: { default: { required: true, accepts: ["paragraph"] } },
    props: {},
    placements: ["framed"],
    compatibleAnimations: [],
    compatibleTransitions: [],
    duration: { minMs: 1000, maxMs: 5000 },
    accessibility: "Text only.",
    ...extra,
  });
}

describe("mediaKinds", () => {
  it("product-demo and text-media take video and image footage", () => {
    expect(getComponent("product-demo")?.mediaKinds).toEqual([
      "video",
      "image",
    ]);
    expect(getComponent("text-media")?.mediaKinds).toEqual(["video", "image"]);
  });

  it("is absent on the other footage components, which take video only", () => {
    expect(getComponent("title")?.mediaKinds).toBeUndefined();
    expect(getComponent("statement")?.mediaKinds).toBeUndefined();
    expect(getComponent("split-screen")?.mediaKinds).toBeUndefined();
  });

  it("accepts a contract that takes video and image framed footage", () => {
    expect(
      parseContract(contract({ mediaKinds: ["video", "image"] }), "sample.json")
        .mediaKinds,
    ).toEqual(["video", "image"]);
  });

  it("rejects an image kind without the framed placement (ADR-0018)", () => {
    expect(() =>
      parseContract(
        contract({ placements: ["background"], mediaKinds: ["image"] }),
        "sample.json",
      ),
    ).toThrow(RegistryError);
    expect(() =>
      parseContract(
        contract({ placements: ["background"], mediaKinds: ["image"] }),
        "sample.json",
      ),
    ).toThrow(/needs the "framed" placement/);
  });

  it("rejects an unknown kind and an empty list", () => {
    expect(() =>
      parseContract(contract({ mediaKinds: ["gif"] }), "sample.json"),
    ).toThrow(RegistryError);
    expect(() =>
      parseContract(contract({ mediaKinds: [] }), "sample.json"),
    ).toThrow(RegistryError);
  });
});
