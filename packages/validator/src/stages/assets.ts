// Stage 3 (PRD §6.3, §9.1; ADR-0006; ADR-0008): every asset reference resolves
// inside the project root, exists, is a regular file, and has a guaranteed format
// for its use. Video and audio files are also probed (ffprobe, cached). A `.video`
// block's source range is checked against the probed duration (task 038,
// media-range.ts). Each failing reference is one error about the scene that
// names it. The references are either passed in, or read from the IR: each
// image block names its file (ADR-0013) and each `.video` block its source.
import type { IrMedia, IrSceneV02 } from "@quarto-video/ir";
import type { Diagnostic } from "../diagnostic.js";
import { resolveAsset } from "../assets/resolve.js";
import type { AssetProblem } from "../assets/syntax.js";
import { formatProblem, type MediaUse } from "../media/formats.js";
import { probeMedia, type MediaOptions } from "./media.js";
import { keptAudioProblem } from "./audio.js";
import { videoRangeProblem, type VideoRange } from "./media-range.js";

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
  /** A `.video` block's source range and timing (task 038); `path` is set per file. */
  range?: Omit<VideoRange, "path">;
  /** A `.video` block with audio="keep" (ADR-0009): its file needs an audio stream. */
  keepAudio?: boolean;
}

/** The scene fields the references are read from, plus its `.video` media. */
type RefScene = Pick<
  IrSceneV02,
  "id" | "durationFrames" | "source" | "content"
> & {
  media?: IrMedia[];
};

/** An IR with a frame rate and scenes (every IR version has both). */
export interface RefIr {
  settings: { fps: number };
  scenes: readonly RefScene[];
}

/** The range check input of one `.video` block, with its scene's timing. */
function rangeOf(
  item: IrMedia,
  fps: number,
  durationFrames: number,
): Omit<VideoRange, "path"> {
  return {
    fps,
    durationFrames,
    sourceStartFrames: item.sourceStartFrames,
    ...(item.sourceEndFrames === undefined
      ? {}
      : { sourceEndFrames: item.sourceEndFrames }),
    loop: item.loop,
    freeze: item.freeze,
    playbackRate: Number(item.playbackRate),
  };
}

export type { MediaOptions } from "./media.js";

/**
 * The references of an IR: each image block's `src` in scene and slot order,
 * then each `.video` block's `src` with its source range (task 038).
 */
export function assetRefsOf(ir: RefIr): AssetRef[] {
  return ir.scenes.flatMap((scene) => {
    const line = scene.source.line;
    const where = {
      sceneId: scene.id,
      file: scene.source.file,
      ...(line === undefined ? {} : { line }),
    };
    const images = Object.values(scene.content.slots).flatMap((blocks) =>
      blocks.flatMap((block): AssetRef[] =>
        block.type === "image" ? [{ path: block.src, ...where }] : [],
      ),
    );
    const videos = (scene.media ?? []).map((item): AssetRef => ({
      path: item.src,
      use: "video",
      ...where,
      range: rangeOf(item, ir.settings.fps, scene.durationFrames),
      keepAudio: item.audio === "keep",
    }));
    return [...images, ...videos];
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
  const probed = probeMedia(use, resolved.path, root, media);
  if (probed.problem !== null || probed.media === undefined) {
    return probed.problem;
  }
  if (ref.range !== undefined) {
    const range = videoRangeProblem(
      { ...ref.range, path: resolved.path },
      probed.media.durationS,
    );
    if (range !== null) return range;
  }
  return ref.keepAudio === true
    ? keptAudioProblem(resolved.path, probed.media)
    : null;
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
