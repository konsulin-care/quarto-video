// cut (registry: transitions/cut.json): no overlap. The next scene starts on the
// frame after the previous one ends, so no frame is ever drawn from both.
import type { TransitionPreset } from "./types.js";

export const cut: TransitionPreset = {
  incoming: () => ({}),
  outgoing: () => ({}),
};
