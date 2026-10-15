// Applies a scene's animation preset (PRD §5.6; task 021) to the whole scene.
// The frame is the scene's own frame (the enclosing Sequence starts it at 0),
// and the scene's length comes from the IR. A scene without an animation is
// drawn as it is.
import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { animationStyle } from "../animations/index.js";
import {
  WordMotionContext,
  type WordMotion,
} from "../animations/word-motion.js";
import {
  StaggerMotionContext,
  type StaggerMotion,
} from "../animations/stagger-motion.js";
import { useTheme } from "../themes/ThemeProvider.js";

export interface AnimatedSceneProps {
  /** A preset id, or undefined for no animation. */
  animation: string | undefined;
  durationFrames: number;
  /** The IR's reduced-motion setting (task 023); absent means false. */
  reducedMotion?: boolean | undefined;
  children: ReactNode;
}

export function AnimatedScene({
  animation,
  durationFrames,
  reducedMotion,
  children,
}: AnimatedSceneProps) {
  const frame = useCurrentFrame();
  const theme = useTheme();
  if (animation === undefined) return <>{children}</>;
  const reduced = reducedMotion === true;
  const style = animationStyle(
    animation,
    frame,
    durationFrames,
    theme,
    reduced,
  );
  // kinetic moves its words, not the scene: the statement reads this (task 026).
  const words: WordMotion | undefined =
    animation === "kinetic"
      ? { frame, durationFrames, tokens: theme, reducedMotion: reduced }
      : undefined;
  // stagger moves the items of its list, not the scene (task 028).
  const items: StaggerMotion | undefined =
    animation === "stagger"
      ? { frame, durationFrames, tokens: theme, reducedMotion: reduced }
      : undefined;
  return (
    <WordMotionContext.Provider value={words}>
      <StaggerMotionContext.Provider value={items}>
        <AbsoluteFill style={style}>{children}</AbsoluteFill>
      </StaggerMotionContext.Provider>
    </WordMotionContext.Provider>
  );
}
