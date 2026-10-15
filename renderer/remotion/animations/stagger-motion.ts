// Per-item motion of `stagger` (task 028). A preset moves the whole scene
// (types.ts), but stagger moves the items of its list. AnimatedScene provides
// this context to the scene's content, and the list (bullets, end-card credits)
// styles each item with it. Every other preset provides no value (undefined).
import { createContext, useContext } from "react";
import type { ThemeTokens } from "@quarto-video/registry";
import { staggerItemStyle } from "./stagger.js";
import type { AnimationStyle } from "./types.js";

/** What a list item needs to be drawn at the current frame. */
export interface StaggerMotion {
  frame: number;
  durationFrames: number;
  tokens: ThemeTokens;
  reducedMotion: boolean;
}

export const StaggerMotionContext = createContext<StaggerMotion | undefined>(
  undefined,
);

/** The item motion of the enclosing scene, or undefined when its preset has none. */
export function useStaggerMotion(): StaggerMotion | undefined {
  return useContext(StaggerMotionContext);
}

/** The style of item `index` of `count` items under `motion`. */
export function itemStyle(
  motion: StaggerMotion | undefined,
  index: number,
  count: number,
): AnimationStyle {
  if (motion === undefined) return {};
  return staggerItemStyle(
    index,
    count,
    motion.frame,
    motion.durationFrames,
    motion.tokens,
    motion.reducedMotion,
  );
}
