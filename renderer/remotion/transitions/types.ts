// The renderer's side of a transition preset (PRD §5.6; task 022). Each side is a
// pure function of progress: the same progress always gives the same style.
// Progress is in (0, 1]: 1 on the overlap's last frame, when the incoming scene
// is complete and the outgoing one is removed (ADR-0005).

/** The style a transition draws on one scene's layer at one frame. */
export interface TransitionStyle {
  opacity?: number;
  transform?: string;
  clipPath?: string;
}

/** One side of a transition: the incoming or the outgoing scene. */
export type TransitionSide = (progress: number) => TransitionStyle;

export interface TransitionPreset {
  incoming: TransitionSide;
  outgoing: TransitionSide;
}
