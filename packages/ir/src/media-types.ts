// Footage items of a scene: the `media` entries of IR 1.6 to 1.10. Types only (ADR-0018).
// A `.video` item is video (IR 1.6 to 1.9, and kind "video" in 1.10) or a framed image
// (IR 1.10, kind "image"). Source times are integer frames of the project fps.

/** Video footage of a scene (task 038). Source times are integer frames of the project fps. */
export interface IrMediaVideo {
  type: "video";
  /** `video` (IR 1.10, ADR-0018): written on every item of a 1.10 manifest; absent before. */
  kind?: "video";
  src: string;
  /** `region` (IR 1.7, ADR-0016): footage of a named region of the scene (see `region`). */
  placement: "background" | "framed" | "region";
  /** The region the footage fills; present only with `region` placement (IR 1.7). */
  region?: string;
  fit: "cover" | "contain";
  /** Frame style; present only with `framed` placement. */
  frame?: "browser" | "phone" | "tablet" | "generic";
  /** Source in-point, in source frames (not timeline frames). */
  sourceStartFrames: number;
  /** Source out-point, in source frames. Absent means the end of the source. */
  sourceEndFrames?: number;
  /** `keep` (IR 1.8, ADR-0009): the source audio plays, scaled by `volume`. */
  audio: "mute" | "keep";
  /** Linear gain of the kept audio, above 0 and at most 1; present only with `keep` (IR 1.8). */
  volume?: number;
  loop: boolean;
  freeze: boolean;
  /** Positive playback speed; 1 is normal speed. */
  playbackRate: number;
  alt: string;
}

/**
 * A still image held for its scene (IR 1.10, ADR-0018): framed only, with no source range,
 * audio or playback settings. `type` stays "video" because the item comes from a `.video` block.
 */
export interface IrMediaImage {
  type: "video";
  kind: "image";
  src: string;
  placement: "framed";
  fit: "cover" | "contain";
  frame: "browser" | "phone" | "tablet" | "generic";
  alt: string;
}

/** A `.video` item: footage (video) or a still (image, IR 1.10). */
export type IrMedia = IrMediaVideo | IrMediaImage;
