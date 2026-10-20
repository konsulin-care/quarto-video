// The scene exit and the animation window of IR 1.12 (ADR-0020). Types only:
// the window is a frame count, the presets are ids the validator checks.
import type { IrAnimation, IrSceneV16, IrVideoV111 } from "./types.js";

/** IR 1.12 scene: IR 1.11 plus an optional exit and window length (ADR-0020). */
export interface IrSceneV112 extends IrSceneV16 {
  /** An exit preset (role exit, for example fade-out), drawn over the scene's last window. */
  exit?: IrAnimation;
  /** Frames of the entrance and the exit window, from `animationDuration` (at least 1). */
  animationDurationFrames?: number;
}

/** IR 1.12 (ADR-0020): IR 1.11 whose scenes may carry an exit and a window length. */
export interface IrVideoV112 extends Omit<
  IrVideoV111,
  "schemaVersion" | "scenes"
> {
  schemaVersion: "1.12";
  scenes: IrSceneV112[];
}
