// wipe (registry: transitions/wipe.json): a left-to-right wipe. The incoming
// scene is clipped to the part the wipe has passed; the outgoing scene stays
// beneath until the wipe completes, then is clipped away entirely.
import type { TransitionPreset } from "./types.js";

export const wipe: TransitionPreset = {
  incoming: (progress) => ({
    clipPath: `inset(0 ${100 * (1 - progress)}% 0 0)`,
  }),
  outgoing: (progress) =>
    progress < 1 ? {} : { clipPath: "inset(0 100% 0 0)" },
};
