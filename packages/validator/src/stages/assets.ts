// Stage 3 (PRD §6.3, §9.1; ADR-0006; ADR-0008): every asset reference resolves
// inside the project root, exists, is a regular file, and has a guaranteed format
// for its use. Video and audio files are also probed (ffprobe, cached). Each
// failing reference is one error about the scene that names it. The references
// are either passed in, or read from the IR: each image block names its file
// (ADR-0013). Media blocks (task 038) add video and audio references here.
import type { IrVideoV02 } from "@quarto-video/ir";
import type { Diagnostic } from "../diagnostic.js";
import { resolveAsset } from "../assets/resolve.js";
import type { AssetProblem } from "../assets/syntax.js";
import { formatProblem, type MediaUse } from "../media/formats.js";
import { mediaProblem, type MediaOptions } from "./media.js";

/** One asset reference: the path as the author wrote it, and where it is written. */
export interface AssetRef {
  path: string;
  sceneId: string;
  /** Document file, relative to the project root, e.g. `index.qmd`. */
  file: string;
  /** Opening line of the scene (1-based), when known. */
  line?: number;
  /** What the file is for. Unset means an image (ADR-0013). */
  use?: MediaUse;
}

export type { MediaOptions } from "./media.js";

/** The references of an IR: each image block's `src`, in scene and slot order. */
export function assetRefsOf(ir: Pick<IrVideoV02, "scenes">): AssetRef[] {
  return ir.scenes.flatMap((scene) => {
    const line = scene.source.line;
    return Object.values(scene.content.slots).flatMap((blocks) =>
      blocks.flatMap((block): AssetRef[] =>
        block.type === "image"
          ? [
              {
                path: block.src,
                sceneId: scene.id,
                file: scene.source.file,
                ...(line === undefined ? {} : { line }),
              },
            ]
          : [],
      ),
    );
  });
}

/** The first problem with one reference, or null when it is valid. */
function referenceProblem(
  ref: AssetRef,
  root: string,
  media: MediaOptions,
): AssetProblem | null {
  const resolved = resolveAsset(root, ref.path);
  if (!resolved.ok) return resolved;
  const use = ref.use ?? "image";
  const format = formatProblem(use, resolved.path);
  if (format !== null || use === "image") return format;
  return mediaProblem(use, resolved.path, root, media);
}

/**
 * Diagnostics for each reference with a problem, in input order. `media` sets
 * the probe and cache for video and audio references (ADR-0008).
 */
export function checkAssets(
  refs: readonly AssetRef[],
  root: string,
  media: MediaOptions = {},
): Diagnostic[] {
  return refs.flatMap((ref): Diagnostic[] => {
    const problem = referenceProblem(ref, root, media);
    if (problem === null) return [];
    return [
      {
        severity: "error",
        code: problem.code,
        message: `${problem.message}\nReferenced by scene "${ref.sceneId}".`,
        file: ref.file,
        ...(ref.line === undefined ? {} : { line: ref.line }),
        sceneId: ref.sceneId,
        ...(problem.assetPath === undefined
          ? {}
          : { assetPath: problem.assetPath }),
        suggestion: problem.suggestion,
      },
    ];
  });
}
