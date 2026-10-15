// Types for IR 0.1 (schema/ir-0.1.json), 0.2, 0.3, 1.0, 1.1, 1.2 and 1.3 (ir-1.3.json).
// Hand-written; tests check them against the schemas and examples. Frames are
// integers; no renderer types.
import type { IrContentV02 } from "./content-types.js";

export type * from "./content-types.js";

export type SchemaVersion =
  "0.1" | "0.2" | "0.3" | "1.0" | "1.1" | "1.2" | "1.3";

export interface IrSettings {
  width: number;
  height: number;
  fps: number;
  /** Hex colour, "#RRGGBB". */
  background: string;
}

/** IR 0.1 scene content: one flat text. */
export interface IrContentV01 {
  text: string;
}

export interface IrSource {
  /** Project-relative path. */
  file: string;
  /** 1-based line of the scene's opening fence in `file`; absent when unknown. */
  line?: number;
}

interface IrSceneBase {
  id: string;
  component: string;
  durationFrames: number;
  source: IrSource;
}

export interface IrSceneV01 extends IrSceneBase {
  content: IrContentV01;
}

export interface IrSceneV02 extends IrSceneBase {
  content: IrContentV02;
}

/** Incoming transition of a scene (ADR-0005). Absent on the first scene. */
export interface IrTransition {
  /** A transition name from the registry, e.g. "cut" or "fade". */
  name: string;
  /** Frames the scene overlaps the previous one; 0 for "cut". */
  durationFrames: number;
}

export interface IrSceneV03 extends IrSceneV02 {
  transition?: IrTransition;
}

/** Animation preset of a scene (ADR-0011). Absent when the scene has none. */
export interface IrAnimation {
  /** A preset id from the registry, e.g. "fade-in". */
  name: string;
}

/** IR 1.1 scene: IR 0.3 plus an optional animation (ADR-0011). */
export interface IrSceneV11 extends IrSceneV03 {
  animation?: IrAnimation;
}

/** Resolved timeline (ADR-0005): where each scene starts and the total length. */
export interface IrTimeline {
  durationFrames: number;
  /** Same order as `scenes`. */
  scenes: { id: string; startFrame: number }[];
}

export interface IrVideoV01 {
  schemaVersion: "0.1";
  type: "video";
  settings: IrSettings;
  scenes: IrSceneV01[];
}

export interface IrVideoV02 {
  schemaVersion: "0.2";
  type: "video";
  settings: IrSettings;
  scenes: IrSceneV02[];
}

export interface IrVideoV03 {
  schemaVersion: "0.3";
  type: "video";
  settings: IrSettings;
  scenes: IrSceneV03[];
  timeline: IrTimeline;
}

/** Versions that the filter writes in (ADR-0007): the build that made the manifest. */
export interface IrGenerator {
  /** Version of the Quarto extension (`_extensions/video`), semver. */
  extension: string;
  /** Version of the `video` CLI package, semver. */
  cli: string;
}

/** IR 1.0 (ADR-0007): IR 0.3 plus the required `generator` block. */
export interface IrVideoV10 extends Omit<IrVideoV03, "schemaVersion"> {
  schemaVersion: "1.0";
  generator: IrGenerator;
}

/** IR 1.1 (ADR-0011): IR 1.0 whose scenes may carry an animation. */
export interface IrVideoV11 extends Omit<
  IrVideoV10,
  "schemaVersion" | "scenes"
> {
  schemaVersion: "1.1";
  scenes: IrSceneV11[];
}

/** IR 1.2 (ADR-0012): IR 1.1 with an optional `reducedMotion` setting. */
export interface IrSettingsV12 extends IrSettings {
  /** Draw each preset's reduced-motion rule (task 023). Absent means false. */
  reducedMotion?: boolean;
}

export interface IrVideoV12 extends Omit<
  IrVideoV11,
  "schemaVersion" | "settings"
> {
  schemaVersion: "1.2";
  settings: IrSettingsV12;
}

/** IR 1.3 (ADR-0013): IR 1.2 whose scene content may hold image blocks. */
export interface IrVideoV13 extends Omit<IrVideoV12, "schemaVersion"> {
  schemaVersion: "1.3";
}

/** Any manifest that carries a resolved `timeline` section (0.3, 1.0 to 1.3). */
export type IrVideoWithTimeline =
  IrVideoV03 | IrVideoV10 | IrVideoV11 | IrVideoV12 | IrVideoV13;

/** Any supported manifest. Renderers read every version through `plainText`. */
export type IrVideo =
  | IrVideoV01
  | IrVideoV02
  | IrVideoV03
  | IrVideoV10
  | IrVideoV11
  | IrVideoV12
  | IrVideoV13;

/** One schema violation. `path` is a JSON Pointer ("" for the root). */
export interface IrError {
  path: string;
  message: string;
  /** A diagnostic code when the error has one, e.g. E_IR_UNSUPPORTED_VERSION. */
  code?: "E_IR_UNSUPPORTED_VERSION";
}

export interface IrValid {
  ok: true;
  errors: [];
}

export interface IrInvalid {
  ok: false;
  errors: IrError[];
}

export type IrValidation = IrValid | IrInvalid;
