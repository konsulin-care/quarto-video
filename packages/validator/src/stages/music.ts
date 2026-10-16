// Stage 3 check of the project music track (task 045; ADR-0017). The file is
// resolved inside the project root (ADR-0006), must be a guaranteed .wav file
// (ADR-0008) and is probed. Its length in frames, round(seconds x fps) as for
// sourceEndFrames, is written into the IR as lengthFrames, so the renderer never
// probes. Stage 4 numbers are checked here too: a track without loop shorter
// than the video is E_MUSIC_SHORT, and a fade-out longer than the video is
// E_MUSIC_FADE. The probe is injected (MediaOptions), so tests read no file.
import type { IrMusic } from "@quarto-video/ir";
import type { AssetProblem } from "../assets/syntax.js";
import { resolveAsset } from "../assets/resolve.js";
import type { Diagnostic } from "../diagnostic.js";
import { formatProblem } from "../media/formats.js";
import { probeMedia, type MediaOptions } from "./media.js";

/** The parts of a manifest the track is checked against. */
export interface MusicManifest {
  settings: { fps: number };
  /** The resolved timeline (IR 0.3 and later); a track needs one. */
  timeline?: { durationFrames: number };
  music?: IrMusic;
  scenes?: readonly { source: { file: string } }[];
}

function fail(problem: AssetProblem, file: string | undefined): Diagnostic {
  return {
    severity: "error",
    code: problem.code,
    message: problem.message,
    ...(file === undefined ? {} : { file }),
    property: "audio.music.src",
    ...(problem.assetPath === undefined
      ? {}
      : { assetPath: problem.assetPath }),
    suggestion: problem.suggestion,
  };
}

function lengthDiagnostic(
  code: "E_MUSIC_SHORT" | "E_MUSIC_FADE",
  message: string,
  suggestion: string,
  property: string,
  file: string | undefined,
): Diagnostic {
  return {
    severity: "error",
    code,
    message,
    ...(file === undefined ? {} : { file }),
    property,
    suggestion,
  };
}

/**
 * The IR with `music.lengthFrames` set from the probed file, and the track's
 * diagnostics. An IR without a track is returned unchanged, without a probe.
 * With errors the caller stops, so the returned IR is only used when clean.
 */
export function resolveMusic<T extends MusicManifest>(
  ir: T,
  root: string,
  options: MediaOptions = {},
): { ir: T; diagnostics: Diagnostic[] } {
  const music = ir.music;
  if (music === undefined || ir.timeline === undefined) {
    return { ir, diagnostics: [] };
  }
  const file = ir.scenes?.[0]?.source.file;
  const resolved = resolveAsset(root, music.src);
  if (!resolved.ok) return { ir, diagnostics: [fail(resolved, file)] };
  const format = formatProblem("audio", resolved.path);
  if (format !== null) return { ir, diagnostics: [fail(format, file)] };
  const probed = probeMedia("audio", resolved.path, root, options);
  if (probed.problem !== null || probed.media === undefined) {
    const problem = probed.problem;
    return { ir, diagnostics: problem === null ? [] : [fail(problem, file)] };
  }
  const { fps } = ir.settings;
  const total = ir.timeline.durationFrames;
  const lengthFrames = Math.round(probed.media.durationS * fps);
  const diagnostics: Diagnostic[] = [];
  if (lengthFrames < 1 || (!music.loop && lengthFrames < total)) {
    const what =
      lengthFrames < 1
        ? "is shorter than one frame"
        : `is ${lengthFrames} frames long, shorter than the video's ${total} frames, and does not loop`;
    diagnostics.push(
      lengthDiagnostic(
        "E_MUSIC_SHORT",
        `The music "${music.src}" ${what}.`,
        "Set loop: true to repeat the file to the end, or use a file at least as long as the video.",
        "audio.music.loop",
        file,
      ),
    );
  }
  if (music.fadeOutFrames !== undefined && music.fadeOutFrames > total) {
    diagnostics.push(
      lengthDiagnostic(
        "E_MUSIC_FADE",
        `The music fade-out is ${music.fadeOutFrames} frames, longer than the video's ${total} frames.`,
        "Use a fadeOut no longer than the video.",
        "audio.music.fadeOut",
        file,
      ),
    );
  }
  const next = { ...music, lengthFrames };
  return {
    ir: { ...ir, music: next },
    diagnostics,
  };
}
