// zoom (registry: transitions/zoom.json): the incoming scene grows from 60% to
// full size while it fades in over the outgoing scene, which is removed on the
// last overlap frame.
import type { TransitionPreset } from "./types.js";

const START_SCALE = 0.6;

export const zoom: TransitionPreset = {
  incoming: (progress) => ({
    opacity: progress,
    transform: `scale(${START_SCALE + (1 - START_SCALE) * progress})`,
  }),
  outgoing: (progress) => (progress < 1 ? {} : { opacity: 0 }),
};
