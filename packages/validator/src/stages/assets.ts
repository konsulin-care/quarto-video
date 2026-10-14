// Stage 3 (PRD §6.3, §9.1; ADR-0006): every asset reference resolves inside
// the project root, exists, and is a regular file. Each failing reference is
// one error about the scene that names it. The references are passed in: the
// IR carries none until a DSL attribute takes an asset (tasks 033, 038).
import type { Diagnostic } from "../diagnostic.js";
import { resolveAsset } from "../assets/resolve.js";

/** One asset reference: the path as the author wrote it, and where it is written. */
export interface AssetRef {
  path: string;
  sceneId: string;
  /** Document file, relative to the project root, e.g. `index.qmd`. */
  file: string;
  /** Opening line of the scene (1-based), when known. */
  line?: number;
}

/** Diagnostics for each reference that does not resolve, in input order. */
export function checkAssets(
  refs: readonly AssetRef[],
  root: string,
): Diagnostic[] {
  return refs.flatMap((ref): Diagnostic[] => {
    const result = resolveAsset(root, ref.path);
    if (result.ok) return [];
    return [
      {
        severity: "error",
        code: result.code,
        message: `${result.message}\nReferenced by scene "${ref.sceneId}".`,
        file: ref.file,
        ...(ref.line === undefined ? {} : { line: ref.line }),
        sceneId: ref.sceneId,
        ...(result.assetPath === undefined
          ? {}
          : { assetPath: result.assetPath }),
        suggestion: result.suggestion,
      },
    ];
  });
}
