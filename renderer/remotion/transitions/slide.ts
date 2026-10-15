// slide (registry: transitions/slide.json): a push. The outgoing scene moves
// one frame width to the left while the incoming scene moves in from the right;
// the two tile the frame, and the outgoing one is off screen at the end.
import type { TransitionPreset } from "./types.js";

export const slide: TransitionPreset = {
  incoming: (progress) => ({
    transform: `translateX(${100 * (1 - progress)}%)`,
  }),
  outgoing: (progress) => ({ transform: `translateX(${-100 * progress}%)` }),
};
