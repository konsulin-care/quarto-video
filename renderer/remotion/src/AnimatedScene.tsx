// Applies a scene's animation preset (PRD §5.6; task 021) to the whole scene.
// The frame is the scene's own frame (the enclosing Sequence starts it at 0),
// and the scene's length comes from the IR. A scene without an animation is
// drawn as it is.
import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { animationStyle } from "../animations/index.js";
import { useTheme } from "../themes/ThemeProvider.js";

export interface AnimatedSceneProps {
  /** A preset id, or undefined for no animation. */
  animation: string | undefined;
  durationFrames: number;
  children: ReactNode;
}

export function AnimatedScene({
  animation,
  durationFrames,
  children,
}: AnimatedSceneProps) {
  const frame = useCurrentFrame();
  const theme = useTheme();
  if (animation === undefined) return <>{children}</>;
  const style = animationStyle(animation, frame, durationFrames, theme);
  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
}
