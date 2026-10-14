// Types for IR 0.1 (schema/ir-0.1.json). Hand-written; tests check them
// against examples/minimal.json. Frames are integers; no renderer types.

export type SchemaVersion = "0.1";

export interface IrSettings {
  width: number;
  height: number;
  fps: number;
  /** Hex colour, "#RRGGBB". */
  background: string;
}

export interface IrContent {
  text: string;
}

export interface IrSource {
  /** Project-relative path. */
  file: string;
  /** 1-based line of the scene's opening fence in `file`; absent when unknown. */
  line?: number;
}

export interface IrScene {
  id: string;
  component: string;
  durationFrames: number;
  content: IrContent;
  source: IrSource;
}

export interface IrVideo {
  schemaVersion: SchemaVersion;
  type: "video";
  settings: IrSettings;
  scenes: IrScene[];
}

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
