// Applies a scene's overlaps with its neighbours (ADR-0005; task 022). The frame
// is the scene's own frame, so the incoming transition acts on its first frames
// and the outgoing one on its last. A scene with no overlap is drawn as it is.
import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { transitionStyle, type Overlap } from "../transitions/index.js";

export interface TransitionSceneProps {
  durationFrames: number;
  /** The transition into this scene; absent for the first scene and for cut. */
  incoming?: Overlap | undefined;
  /** The transition out of this scene, given by the next scene. */
  outgoing?: Overlap | undefined;
  children: ReactNode;
}

export function TransitionScene({
  durationFrames,
  incoming,
  outgoing,
  children,
}: TransitionSceneProps) {
  const frame = useCurrentFrame();
  const style = transitionStyle(frame, durationFrames, incoming, outgoing);
  if (style === undefined) return <>{children}</>;
  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
}
