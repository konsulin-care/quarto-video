// Per-word motion of `kinetic` (task 026). A preset moves the whole scene
// (types.ts), but kinetic moves the words of its statement. AnimatedScene
// provides this context to the scene's content, and the statement styles each
// word with it. Every other preset provides no value (undefined).
import { createContext, useContext } from "react";
import type { ThemeTokens } from "@quarto-video/registry";
import { kineticWordStyle } from "./kinetic.js";
import type { AnimationStyle } from "./types.js";

/** What a word needs to be drawn at the current frame. */
export interface WordMotion {
  frame: number;
  durationFrames: number;
  tokens: ThemeTokens;
  reducedMotion: boolean;
}

export const WordMotionContext = createContext<WordMotion | undefined>(
  undefined,
);

/** The word motion of the enclosing scene, or undefined when its preset has none. */
export function useWordMotion(): WordMotion | undefined {
  return useContext(WordMotionContext);
}

/** The style of word `index` of `count` words under `motion`. */
export function wordStyle(
  motion: WordMotion,
  index: number,
  count: number,
): AnimationStyle {
  return kineticWordStyle(
    index,
    count,
    motion.frame,
    motion.durationFrames,
    motion.tokens,
    motion.reducedMotion,
  );
}
