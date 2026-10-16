// Stage 3 source end (task 039; ADR-0008). A `.video` block with no sourceEnd
// plays to the end of its file. Looping, freezing and trimming need that end, and
// the renderer never probes files, so the probed duration is written into the IR
// as sourceEndFrames: source frames at the project fps, rounded as the range check
// rounds (stages/media-range.ts). Footage that cannot be probed is left as it is;
// stage 3 has already reported it.
import type { SceneWithMedia } from "./media-placement.js";
import { probeMedia, type MediaOptions } from "./media.js";

/** The parts of a manifest this stage reads and writes. */
export interface SourceEndManifest {
  settings: { fps: number };
  scenes: readonly SceneWithMedia[];
}

/** The IR with each `.video` block's sourceEndFrames set from its file (task 039). */
export function resolveSourceEnds<T extends SourceEndManifest>(
  ir: T,
  root: string,
  options: MediaOptions = {},
): T {
  const { fps } = ir.settings;
  const scenes = ir.scenes.map((scene): SceneWithMedia => {
    if (scene.media === undefined) return scene;
    const media = scene.media.map((item) => {
      if (item.type !== "video" || item.sourceEndFrames !== undefined) {
        return item;
      }
      const probed = probeMedia("video", item.src, root, options);
      if (probed.media === undefined) return item;
      return {
        ...item,
        sourceEndFrames: Math.round(probed.media.durationS * fps),
      };
    });
    return { ...scene, media };
  });
  return { ...ir, scenes };
}
