// Stage 2 placement of `.video` footage (task 039; PRD §6.1): a block's placement
// must be one its component lists. Synthetic contracts, so the rule is tested
// without the shipped registry.
import type { ComponentContract } from "@quarto-video/registry";
import type { IrMedia } from "@quarto-video/ir";
import { describe, expect, it } from "vitest";
import {
  checkMediaPlacement,
  type SceneWithMedia,
} from "../src/stages/media-placement.js";

function contract(
  id: string,
  placements: ComponentContract["placements"],
): ComponentContract {
  return {
    id,
    version: "1.0.0",
    purpose: "Test component.",
    slots: { default: { required: true, accepts: ["paragraph"] } },
    props: {},
    placements,
    compatibleAnimations: [],
    compatibleTransitions: [],
    duration: { minMs: 1000, maxMs: 30000 },
    accessibility: "Test only.",
  };
}

const COMPONENTS = [
  contract("backdrop", ["background"]),
  contract("plain", []),
];

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

function scene(component: string, media: IrMedia[]): SceneWithMedia {
  return {
    id: "intro",
    component,
    durationFrames: 60,
    content: { slots: { default: [{ type: "paragraph", inlines: [] }] } },
    source: { file: "index.qmd", line: 4 },
    media,
  };
}

describe("video placement against the component contract", () => {
  it("accepts background footage on a component that takes it", () => {
    expect(
      checkMediaPlacement(
        { scenes: [scene("backdrop", [video("background")])] },
        COMPONENTS,
      ),
    ).toEqual([]);
  });

  it("rejects background footage on a component that does not take it", () => {
    const found = checkMediaPlacement(
      { scenes: [scene("plain", [video("background")])] },
      COMPONENTS,
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      code: "E_MEDIA_PLACEMENT",
      severity: "error",
      sceneId: "intro",
      component: "plain",
      line: 4,
      property: "media",
      message: 'Component "plain" does not take "background" footage.',
    });
    expect(found[0]?.suggestion).toBe(
      'Components that take "background" footage: backdrop.',
    );
  });

  it("rejects framed footage while no component takes it", () => {
    const found = checkMediaPlacement(
      { scenes: [scene("backdrop", [video("framed")])] },
      COMPONENTS,
    );
    expect(found).toHaveLength(1);
    expect(found[0]?.suggestion).toBe(
      'Components that take "framed" footage: none yet.',
    );
  });

  it("reports nothing for a scene without media or with an unknown component", () => {
    expect(
      checkMediaPlacement(
        {
          scenes: [scene("plain", []), scene("missing", [video("background")])],
        },
        COMPONENTS,
      ),
    ).toEqual([]);
  });
});
