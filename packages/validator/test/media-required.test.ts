// Stage 2 check that a `requiresMedia` component has footage (task 041): a scene
// with no `.video` block is E_SLOT_MISSING; a block with a placement the
// component does not take is left to E_MEDIA_PLACEMENT. Synthetic contracts.
import type { ComponentContract } from "@quarto-video/registry";
import type { IrMedia } from "@quarto-video/ir";
import { describe, expect, it } from "vitest";
import { checkMediaRequired } from "../src/stages/media-required.js";
import type { SceneWithMedia } from "../src/stages/media-placement.js";

const DEMO: ComponentContract = {
  id: "demo",
  version: "1.0.0",
  purpose: "Test component.",
  slots: { caption: { required: false, accepts: ["paragraph"] } },
  props: {},
  placements: ["framed"],
  compatibleAnimations: [],
  compatibleTransitions: [],
  duration: { minMs: 1000, maxMs: 30000 },
  accessibility: "Test only.",
  requiresMedia: true,
};

const PLAIN: ComponentContract = {
  id: "plain",
  version: "1.0.0",
  purpose: "Test component without footage.",
  slots: { caption: { required: false, accepts: ["paragraph"] } },
  props: {},
  placements: [],
  compatibleAnimations: [],
  compatibleTransitions: [],
  duration: { minMs: 1000, maxMs: 30000 },
  accessibility: "Test only.",
};

function video(placement: IrMedia["placement"]): IrMedia {
  return {
    type: "video",
    src: "assets/clip.mp4",
    placement,
    fit: "contain",
    ...(placement === "framed" ? { frame: "browser" as const } : {}),
    sourceStartFrames: 0,
    audio: "mute",
    loop: false,
    freeze: false,
    playbackRate: 1,
    alt: "",
  };
}

function scene(component: string, media?: IrMedia[]): SceneWithMedia {
  return {
    id: "intro",
    component,
    durationFrames: 60,
    content: { slots: {} },
    source: { file: "index.qmd", line: 4 },
    ...(media === undefined ? {} : { media }),
  };
}

describe("footage a component requires", () => {
  it("reports a scene with no .video block as E_SLOT_MISSING, naming the placement", () => {
    const found = checkMediaRequired({ scenes: [scene("demo")] }, [
      DEMO,
      PLAIN,
    ]);
    expect(found.map((d) => [d.code, d.line, d.property])).toEqual([
      ["E_SLOT_MISSING", 4, "media"],
    ]);
    expect(found[0]?.suggestion).toContain('placement "framed"');
  });

  it("accepts a framed .video block", () => {
    expect(
      checkMediaRequired({ scenes: [scene("demo", [video("framed")])] }, [
        DEMO,
        PLAIN,
      ]),
    ).toEqual([]);
  });

  it("leaves a block with a placement the component does not take to E_MEDIA_PLACEMENT", () => {
    expect(
      checkMediaRequired({ scenes: [scene("demo", [video("background")])] }, [
        DEMO,
        PLAIN,
      ]),
    ).toEqual([]);
  });

  it("ignores components that do not require footage", () => {
    expect(
      checkMediaRequired({ scenes: [scene("plain")] }, [DEMO, PLAIN]),
    ).toEqual([]);
  });
});
