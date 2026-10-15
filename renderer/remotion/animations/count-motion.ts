// Counted value of `count-up` (task 032). A preset moves the whole scene
// (types.ts), but count-up changes the number of a statistic. AnimatedScene
// provides this context to the scene's content, and the statistic draws the
// counted value with it. Every other preset provides no value (undefined).
import { createContext, useContext } from "react";
import { countUpValue } from "./count-up.js";

/** What the number of a statistic needs to be drawn at the current frame. */
export interface CountMotion {
  frame: number;
  durationFrames: number;
  reducedMotion: boolean;
}

export const CountMotionContext = createContext<CountMotion | undefined>(
  undefined,
);

/** The count motion of the enclosing scene, or undefined when its preset has none. */
export function useCountMotion(): CountMotion | undefined {
  return useContext(CountMotionContext);
}

/** `value` as drawn under `motion`: the counted value, or `value` itself with no count-up. */
export function countedValue(
  motion: CountMotion | undefined,
  value: number,
): number {
  if (motion === undefined) return value;
  return countUpValue(
    value,
    motion.frame,
    motion.durationFrames,
    motion.reducedMotion,
  );
}
