// Stage 2 check of the footage kind of a `.video` block (ADR-0018): an image in a
// component that takes video only is E_MEDIA_KIND; a kind the component takes, or
// a placement it does not take (E_MEDIA_PLACEMENT's), is left alone. Synthetic
// contracts, so the check does not depend on the shipped components.
import type { IrMedia } from "@quarto-video/ir";
import type { ComponentContract } from "@quarto-video/registry";
import { describe, expect, it } from "vitest";
import { checkMediaKind } from "../src/stages/media-kind.js";
import type { SceneWithMedia } from "../src/stages/media-placement.js";

const BASE: Omit<ComponentContract, "id" | "placements"> = {
  version: "1.0.0",
  purpose: "Test component.",
  slots: { caption: { required: false, accepts: ["paragraph"] } },
  props: {},
  compatibleAnimations: [],
  compatibleTransitions: [],
  duration: { minMs: 1000, maxMs: 30000 },
  accessibility: "Test only.",
};

const BOTH: ComponentContract = {
  ...BASE,
  id: "both",
  placements: ["framed"],
  mediaKinds: ["video", "image"],
  requiresMedia: true,
};
const VIDEO_ONLY: ComponentContract = {
  ...BASE,
  id: "video-only",
  placements: ["framed"],
};

function framed(kind: "video" | "image"): IrMedia {
  if (kind === "image") {
    return {
      type: "video",
      kind: "image",
      src: "assets/still.png",
      placement: "framed",
      fit: "cover",
      frame: "browser",
      alt: "",
    };
  }
  return {
    type: "video",
    kind: "video",
    src: "assets/clip.mp4",
    placement: "framed",
    fit: "contain",
    frame: "browser",
    sourceStartFrames: 0,
    audio: "mute",
    loop: false,
    freeze: false,
    playbackRate: 1,
    alt: "",
  };
}

function scene(component: string, media: IrMedia[]): SceneWithMedia {
  return {
    id: "intro",
    component,
    durationFrames: 60,
    content: { slots: {} },
    source: { file: "index.qmd", line: 4 },
    media,
  };
}

const COMPONENTS = [BOTH, VIDEO_ONLY];

describe("media kind check (ADR-0018)", () => {
  it("accepts an image in a component that takes image footage", () => {
    expect(
      checkMediaKind(
        { scenes: [scene("both", [framed("image")])] },
        COMPONENTS,
      ),
    ).toEqual([]);
  });

  it("accepts video in a component that takes video only", () => {
    expect(
      checkMediaKind(
        { scenes: [scene("video-only", [framed("video")])] },
        COMPONENTS,
      ),
    ).toEqual([]);
  });

  it("reports an image in a component that takes video only as E_MEDIA_KIND, naming the takers", () => {
    const found = checkMediaKind(
      { scenes: [scene("video-only", [framed("image")])] },
      COMPONENTS,
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      severity: "error",
      code: "E_MEDIA_KIND",
      sceneId: "intro",
      message: 'Component "video-only" does not take image footage.',
      suggestion: 'Components that take image footage at "framed": both.',
    });
  });

  it("leaves a block whose placement the component does not take to E_MEDIA_PLACEMENT", () => {
    const background: IrMedia = {
      type: "video",
      kind: "video",
      src: "assets/clip.mp4",
      placement: "background",
      fit: "contain",
      sourceStartFrames: 0,
      audio: "mute",
      loop: false,
      freeze: false,
      playbackRate: 1,
      alt: "",
    };
    expect(
      checkMediaKind(
        { scenes: [scene("video-only", [background])] },
        COMPONENTS,
      ),
    ).toEqual([]);
  });

  it("treats an item with no kind as video (IR 1.6 to 1.9)", () => {
    const legacy: IrMedia = {
      type: "video",
      src: "assets/clip.mp4",
      placement: "framed",
      fit: "contain",
      frame: "browser",
      sourceStartFrames: 0,
      audio: "mute",
      loop: false,
      freeze: false,
      playbackRate: 1,
      alt: "",
    };
    expect(
      checkMediaKind({ scenes: [scene("video-only", [legacy])] }, COMPONENTS),
    ).toEqual([]);
  });
});
