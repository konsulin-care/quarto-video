// Types for IR 0.1 (schema/ir-0.1.json), 0.2 (ir-0.2.json) and 0.3 (ir-0.3.json).
// Hand-written; tests check them against the schemas and examples. Frames are
// integers; no renderer types.
import type { IrContentV02 } from "./content-types.js";

export type * from "./content-types.js";

export type SchemaVersion = "0.1" | "0.2" | "0.3";

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

/** Any supported manifest. Renderers read every version through `plainText`. */
export type IrVideo = IrVideoV01 | IrVideoV02 | IrVideoV03;

/** One schema violation. `path` is a JSON Pointer ("" for the root). */
export interface IrError {
  path: string;
  message: string;
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
