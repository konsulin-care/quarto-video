// Stage 6 (PRD §9.1, §11.2): the file the renderer wrote matches the IR. Pure:
// the CLI probes the file (ffprobe) and passes the facts in, so the validator
// runs no tool itself. A missing or empty file, one with no readable video, or
// a size, rate or frame count that differs from the IR blocks the output.
import { timelineOf, type IrVideo } from "@quarto-video/ir";
import type { Diagnostic } from "../diagnostic.js";

/** What ffprobe reports for the first video stream of the output. */
export interface VideoFacts {
  width: number;
  height: number;
  /** Frames per second; a fraction for rates such as 30000/1001. */
  fps: number;
  /** Decoded frames, not the container's duration estimate. */
  frames: number;
}

export interface OutputFacts {
  /** Deliverable path relative to the project root, e.g. `output.mp4`. */
  file: string;
  /** False when nothing is at the path (or it is not a regular file). */
  exists: boolean;
  bytes: number;
  /** Null when the file has no readable video stream. */
  video: VideoFacts | null;
}

const PROPERTIES = ["width", "height", "fps", "frames"] as const;

/** Stage 6 diagnostics for one rendered file, compared with the manifest it came from. */
export function checkOutput(ir: IrVideo, facts: OutputFacts): Diagnostic[] {
  const base = { severity: "error" as const, file: facts.file };
  if (!facts.exists || facts.bytes === 0) {
    return [
      {
        ...base,
        code: "E_OUTPUT_MISSING",
        message: `${facts.file} was not written or is empty.`,
        suggestion:
          "Run the render again; the previous output was left unchanged.",
      },
    ];
  }
  const actual = facts.video;
  if (actual === null) {
    return [
      {
        ...base,
        code: "E_OUTPUT_UNREADABLE",
        message: `${facts.file} has no readable video stream.`,
        suggestion:
          "Check the renderer and its encoder (renderer/remotion/README.md).",
      },
    ];
  }
  const expected = {
    width: ir.settings.width,
    height: ir.settings.height,
    fps: ir.settings.fps,
    frames: timelineOf(ir).durationFrames,
  };
  return PROPERTIES.flatMap((property): Diagnostic[] => {
    if (actual[property] === expected[property]) return [];
    return [
      {
        ...base,
        code: "E_OUTPUT_MISMATCH",
        message: `${property}: ${facts.file} has ${actual[property]}, the IR expects ${expected[property]}.`,
        property,
        suggestion:
          "The file is not the video the IR describes; it is not written to video.output.",
      },
    ];
  });
}
