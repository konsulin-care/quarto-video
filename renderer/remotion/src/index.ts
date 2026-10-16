export const PACKAGE_NAME = "@quarto-video/remotion";

// The public boundary for callers such as packages/cli (renderer/remotion/README.md).
export { render, loadIr } from "./render.js";
export { renderStills } from "./still.js";
export type { StillOptions } from "./still.js";
export type { RenderFn, RenderOptions, RenderProgress } from "./render.js";
export { IrRenderError } from "./errors.js";
