// Types for IR 0.1 (schema/ir-0.1.json) and IR 0.2 (schema/ir-0.2.json).
// Hand-written; tests check them against the schemas and examples. Frames are
// integers; no renderer types.
import type { IrContentV02 } from "./content-types.js";

export type * from "./content-types.js";

export type SchemaVersion = "0.1" | "0.2";

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

/** Any supported manifest. Renderers read both versions through `plainText`. */
export type IrVideo = IrVideoV01 | IrVideoV02;

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
