// Safe-area margins in pixels for a frame size (PRD §10.2). The arithmetic lives
// in the registry's layout module (task 025), so the validator and the renderer
// use the same margins.
export { safeAreaPixels, type Margins } from "@quarto-video/registry/layout";
