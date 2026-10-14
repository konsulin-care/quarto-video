export const PACKAGE_NAME = "@quarto-video/ir";
export { validateIr } from "./validate.js";
export type * from "./types.js";
export { durationToFrames } from "./duration.js";
export {
  hasTimeline,
  resolveTimeline,
  timelineOf,
  type TimedScene,
} from "./timeline.js";
export {
  LATEST_VERSION,
  SUPPORTED_VERSIONS,
  UNSUPPORTED_VERSION_CODE,
  type SupportedVersion,
} from "./versions.js";
