// The contract data model (packages/registry/README.md, PRD §5.5). Mirrors
// schema/contract.json; the loader checks every file against that schema.

/** Block kinds a slot may accept (ADR-0004). */
export type BlockKind = "paragraph" | "heading" | "list" | "code-block";

export interface SlotContract {
  required: boolean;
  accepts: BlockKind[];
  /** More blocks than this is a warning (W_SLOT_TOO_MANY_BLOCKS), not an error. */
  maxBlocks?: number;
}

export interface PropContract {
  type: "string" | "boolean" | "enum";
  enum?: string[];
  default?: string | boolean;
}

export interface DurationBounds {
  minMs: number;
  maxMs: number;
}

/** A name in the theme's type scale (`typography.scale`). */
export type ScaleName = "caption" | "body" | "subtitle" | "title";

/** The sizes a component's text may take, from `max` down to `min` (task 025). */
export interface TextFit {
  max: ScaleName;
  min: ScaleName;
}

export interface ComponentContract {
  id: string;
  version: string;
  purpose: string;
  slots: Record<string, SlotContract>;
  props: Record<string, PropContract>;
  placements: ("background" | "framed")[];
  compatibleAnimations: string[];
  compatibleTransitions: string[];
  duration: DurationBounds;
  accessibility: string;
  /** Scales the `default` slot's text within this range; absent means no scaling. */
  textFit?: TextFit;
}

/** Colour roles a theme declares (schema/theme.json). Hex `#RRGGBB` values. */
export interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  mutedText: string;
  accent: string;
}

/** Safe-area margins as a percent of the frame width (x) and height (y). */
export interface SafeArea {
  xPercent: number;
  yPercent: number;
}

/** The design tokens of one named theme (PRD §10; schema/theme.json). */
export interface ThemeTokens {
  id: string;
  version: string;
  purpose: string;
  colors: ThemeColors;
  contrastPairs: { text: keyof ThemeColors; background: keyof ThemeColors }[];
  typography: {
    fontFamily: string;
    weights: { regular: number; semibold: number; bold: number };
    scale: { caption: number; body: number; subtitle: number; title: number };
    lineHeight: { tight: number; body: number };
  };
  space: { xs: number; sm: number; md: number; lg: number };
  radius: { sm: number; md: number };
  /** Keyed by aspect ratio, e.g. "16:9". */
  safeArea: Record<string, SafeArea>;
  motion: { fastMs: number; baseMs: number; slowMs: number };
}

/** An animation preset's data (schema/animation.json, PRD §5.6). */
export interface AnimationPreset {
  id: string;
  version: string;
  purpose: string;
  compatibleComponents: string[];
  /** Shortest scene, in frames, that plays the preset as designed. */
  minFrames: number;
  /** Shown for a scene shorter than minFrames. */
  shortScene: "static";
  /** Shown when reduced motion is requested (task 023). */
  reducedMotion: "static";
}

/** A transition preset's data (schema/transition.json, PRD §5.6; ADR-0005). */
export interface TransitionPreset {
  id: string;
  version: string;
  purpose: string;
  /** Milliseconds, fps-independent (ADR-0003). Only cut's are all 0. */
  duration: { defaultMs: number; minMs: number; maxMs: number };
  /** The registered transition drawn when reduced motion is requested (task 023). */
  reducedMotion: string;
}
