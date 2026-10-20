// Applies a scene's animation preset (entrance, PRD §5.6; task 021) and its exit
// (ADR-0020) to the whole scene. The frame is the scene's own frame (the enclosing
// Sequence starts it at 0), and the scene's length comes from the IR. A scene
// without an animation or an exit is drawn as it is.
import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import {
  animationStyle,
  combineStyles,
  exitStyle,
} from "../animations/index.js";
import {
  CountMotionContext,
  type CountMotion,
} from "../animations/count-motion.js";
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
  /** An exit preset id (ADR-0020), or undefined for no exit. */
  exit?: string | undefined;
  durationFrames: number;
  /** The scene's animationDuration in frames (ADR-0020); undefined for the default window. */
  windowFrames?: number | undefined;
  /** The IR's reduced-motion setting (task 023); absent means false. */
  reducedMotion?: boolean | undefined;
  children: ReactNode;
}

export function AnimatedScene({
  animation,
  exit,
  durationFrames,
  windowFrames,
  reducedMotion,
  children,
}: AnimatedSceneProps) {
  const frame = useCurrentFrame();
  const theme = useTheme();
  if (animation === undefined && exit === undefined) return <>{children}</>;
  const reduced = reducedMotion === true;
  const entrance =
    animation === undefined
      ? {}
      : animationStyle(
          animation,
          frame,
          durationFrames,
          theme,
          reduced,
          windowFrames,
        );
  const leaving =
    exit === undefined
      ? {}
      : exitStyle(exit, frame, durationFrames, theme, reduced, windowFrames);
  const style = combineStyles(entrance, leaving);
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
  // count-up changes the number of its statistic, not the scene (task 032).
  const count: CountMotion | undefined =
    animation === "count-up"
      ? { frame, durationFrames, reducedMotion: reduced }
      : undefined;
  return (
    <WordMotionContext.Provider value={words}>
      <StaggerMotionContext.Provider value={items}>
        <CountMotionContext.Provider value={count}>
          <AbsoluteFill style={style}>{children}</AbsoluteFill>
        </CountMotionContext.Provider>
      </StaggerMotionContext.Provider>
    </WordMotionContext.Provider>
  );
}
