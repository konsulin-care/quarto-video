// The contract data model (packages/registry/README.md, PRD §5.5). Mirrors
// schema/contract.json; the loader checks every file against that schema.

/** Block kinds a slot may accept (ADR-0004). */
export type BlockKind = "paragraph" | "heading" | "list" | "code-block";

export interface SlotContract {
  required: boolean;
  accepts: BlockKind[];
}

/**
 * A component prop. `csv`: a project CSV path, parsed by the validator (ADR-0013).
 * `column`: a column of the csv prop named by `of`; `numeric` requires numbers.
 */
export interface PropContract {
  type: "string" | "boolean" | "enum" | "csv" | "column";
  enum?: string[];
  default?: string | boolean;
  /** The prop must be given on every scene of the component. */
  required?: boolean;
  /** For `column`: the name of the `csv` prop whose header it names. */
  of?: string;
  /** For `column`: the cells must be finite numbers. */
  numeric?: boolean;
}

export interface DurationBounds {
  minMs: number;
  maxMs: number;
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
