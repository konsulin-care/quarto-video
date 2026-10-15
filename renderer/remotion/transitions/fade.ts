// fade (registry: transitions/fade.json): a crossfade. The incoming scene's
// opacity rises over the overlap while the outgoing scene stays opaque beneath
// it. On the last overlap frame the incoming scene is opaque, so the outgoing
// one is removed there.
import type { TransitionPreset } from "./types.js";

export const fade: TransitionPreset = {
  incoming: (progress) => ({ opacity: progress }),
  outgoing: (progress) => (progress < 1 ? {} : { opacity: 0 }),
};
