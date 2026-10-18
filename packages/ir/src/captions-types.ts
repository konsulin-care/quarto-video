// The project caption track of IR 1.11 (ADR-0019, task 046). Types only: the
// cues are frame numbers and plain text, never markup or code.

/** How the captions are used: drawn into the picture, written beside the output, or both. */
export type CaptionMode = "burn" | "sidecar" | "both";

/** One caption, shown on frames startFrame up to endFrame (exclusive) of the timeline. */
export interface IrCaptionCue {
  startFrame: number;
  endFrame: number;
  /** Plain text; a newline starts a second line. */
  text: string;
}

/** The project's caption track; a top-level IR 1.11 field. */
export interface IrCaptions {
  /** Project-relative WebVTT file (ADR-0006). */
  src: string;
  mode: CaptionMode;
  /** The cues in frames, in file order; written by the validator (stage 3). */
  cues?: IrCaptionCue[];
}
