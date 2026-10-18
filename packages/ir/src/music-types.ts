// The project background music track of IR 1.9 (ADR-0017, task 045). Types
// only: the track is a file reference and frame counts, never code.

/** The project's one background music track; a top-level IR 1.9 field. */
export interface IrMusic {
  /** Project-relative audio file (ADR-0006, ADR-0008). */
  src: string;
  /** Linear gain, above 0 and at most 1. */
  volume: number;
  /** The file repeats back to back until the timeline ends. */
  loop: boolean;
  /** Linear fade to silence over the last N frames of the timeline. Absent means none. */
  fadeOutFrames?: number;
  /** The file length in frames at the project fps; written by the validator (stage 3). */
  lengthFrames?: number;
}
