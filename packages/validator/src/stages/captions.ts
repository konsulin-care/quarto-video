// Stage 3 check of the project caption track (task 046; ADR-0019). The WebVTT file
// is resolved inside the project root (ADR-0006), must be a .vtt file, and is parsed
// by vtt/parse.ts. Each cue becomes frames: round half up of ms x fps / 1000, the
// rounding of ADR-0003. Stage 4 numbers are checked here too: a cue that ends after
// the video is E_CAPTIONS_RANGE, and cues that overlap are E_CAPTIONS_OVERLAP (no
// overlap is allowed yet). The cues are written into the IR, so the renderer never
// parses the file. Diagnostics about the file cite its line.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { IrCaptions, IrCaptionCue } from "@quarto-video/ir";
import { resolveAsset } from "../assets/resolve.js";
import type { Diagnostic } from "../diagnostic.js";
import { extensionOf } from "../media/formats.js";
import { parseVtt, problemDiagnostic, type VttCue } from "../vtt/parse.js";

/** The parts of a manifest the caption track is checked against. */
export interface CaptionsManifest {
  settings: { fps: number };
  /** The resolved timeline (IR 0.3 and later); a track needs one. */
  timeline?: { durationFrames: number };
  captions?: IrCaptions;
  scenes?: readonly { source: { file: string } }[];
}

/** Frames for a time in milliseconds: round half up of ms x fps / 1000 (ADR-0003). */
export function frameOf(ms: number, fps: number): number {
  return Math.floor((2 * ms * fps + 1000) / 2000);
}

/** A problem with the setting itself, about the document (`file`). */
function settingDiagnostic(
  code: Diagnostic["code"],
  message: string,
  suggestion: string,
  file: string | undefined,
): Diagnostic {
  return {
    severity: "error",
    code,
    message,
    ...(file === undefined ? {} : { file }),
    property: "video.captions.src",
    suggestion,
  };
}

/** The file read as text, or the reason it cannot be read as a diagnostic. */
function readCaptionFile(
  path: string,
  src: string,
  file: string | undefined,
): { text: string } | { diagnostic: Diagnostic } {
  try {
    return { text: readFileSync(path, "utf8") };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return {
      diagnostic: settingDiagnostic(
        "E_ASSET_INVALID",
        `Cannot read the caption file "${src}": ${reason}`,
        "Check that the file exists and is readable.",
        file,
      ),
    };
  }
}

/** Cue ranges in frames: the cues that fit the timeline, and the errors of the rest. */
function framesOf(
  cues: readonly VttCue[],
  fps: number,
  total: number,
  src: string,
): {
  kept: { cue: VttCue; cueFrames: IrCaptionCue }[];
  diagnostics: Diagnostic[];
} {
  const kept: { cue: VttCue; cueFrames: IrCaptionCue }[] = [];
  const diagnostics: Diagnostic[] = [];
  for (const cue of cues) {
    const startFrame = frameOf(cue.startMs, fps);
    const endFrame = frameOf(cue.endMs, fps);
    const at = { file: src, line: cue.line };
    if (endFrame <= startFrame) {
      diagnostics.push({
        severity: "error",
        code: "E_CAPTIONS_TIMESTAMP",
        message: `The cue lasts less than one frame at ${fps} fps.`,
        ...at,
        suggestion:
          "Make the cue last at least one frame (about 33 ms at 30 fps).",
      });
    } else if (endFrame > total) {
      diagnostics.push({
        severity: "error",
        code: "E_CAPTIONS_RANGE",
        message: `The cue ends at frame ${endFrame}, after the video's ${total} frames.`,
        ...at,
        suggestion: "End the cue within the video, or lengthen the video.",
      });
    } else {
      kept.push({ cue, cueFrames: { startFrame, endFrame, text: cue.text } });
    }
  }
  return { kept, diagnostics };
}

/** Overlaps between kept cues: each cue that starts before an earlier one ends. */
function overlapsOf(
  kept: readonly { cue: VttCue; cueFrames: IrCaptionCue }[],
  src: string,
): Diagnostic[] {
  const byStart = [...kept].sort(
    (a, b) => a.cueFrames.startFrame - b.cueFrames.startFrame,
  );
  const diagnostics: Diagnostic[] = [];
  let latest: (typeof kept)[number] | undefined;
  for (const entry of byStart) {
    if (
      latest !== undefined &&
      entry.cueFrames.startFrame < latest.cueFrames.endFrame
    ) {
      diagnostics.push({
        severity: "error",
        code: "E_CAPTIONS_OVERLAP",
        message: `The cue at line ${entry.cue.line} overlaps the cue at line ${latest.cue.line}.`,
        file: src,
        line: entry.cue.line,
        suggestion:
          "Give each cue its own time: the next cue starts after the last one ends.",
      });
    }
    if (
      latest === undefined ||
      entry.cueFrames.endFrame > latest.cueFrames.endFrame
    ) {
      latest = entry;
    }
  }
  return diagnostics;
}

/**
 * The IR with `captions.cues` set from the file, and the track's diagnostics. An
 * IR without a track is returned unchanged, without a read. With errors the caller
 * stops, so the returned IR is only used when clean.
 */
export function resolveCaptions<T extends CaptionsManifest>(
  ir: T,
  root: string,
): { ir: T; diagnostics: Diagnostic[] } {
  const captions = ir.captions;
  if (captions === undefined || ir.timeline === undefined) {
    return { ir, diagnostics: [] };
  }
  const file = ir.scenes?.[0]?.source.file;
  const resolved = resolveAsset(root, captions.src);
  if (!resolved.ok) {
    return {
      ir,
      diagnostics: [
        settingDiagnostic(
          resolved.code,
          resolved.message,
          resolved.suggestion,
          file,
        ),
      ],
    };
  }
  if (extensionOf(resolved.path) !== ".vtt") {
    return {
      ir,
      diagnostics: [
        settingDiagnostic(
          "E_MEDIA_FORMAT",
          `Asset "${captions.src}" is not a WebVTT (.vtt) file.`,
          "Use a WebVTT file, for example assets/captions.vtt.",
          file,
        ),
      ],
    };
  }
  const read = readCaptionFile(join(root, resolved.path), captions.src, file);
  if ("diagnostic" in read) return { ir, diagnostics: [read.diagnostic] };
  const parsed = parseVtt(read.text);
  const { fps } = ir.settings;
  const total = ir.timeline.durationFrames;
  const ranged = framesOf(parsed.cues, fps, total, captions.src);
  const diagnostics: Diagnostic[] = [
    ...parsed.problems.map((problem) =>
      problemDiagnostic(problem, captions.src),
    ),
    ...ranged.diagnostics,
    ...overlapsOf(ranged.kept, captions.src),
  ];
  const cues = ranged.kept.map((entry) => entry.cueFrames);
  return {
    ir: { ...ir, captions: { ...captions, cues } },
    diagnostics,
  };
}
