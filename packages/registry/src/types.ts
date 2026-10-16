// The contract data model (packages/registry/README.md, PRD §5.5). Mirrors
// schema/contract.json; the loader checks every file against that schema.

/** Block kinds a slot may accept (ADR-0004). */
export type BlockKind =
  "paragraph" | "heading" | "list" | "code-block" | "image";

export interface SlotContract {
  required: boolean;
  accepts: BlockKind[];
  /** More blocks than this is a warning (W_SLOT_TOO_MANY_BLOCKS), not an error. */
  maxBlocks?: number;
  /**
   * Optional (task 039): another slot of the same component that holds this
   * slot's text instead. The slot is then not required, and the two are
   * exclusive: a scene fills one of them.
   */
  alternative?: string;
  /** Optional: the slot holds one list whose item count is in this range (task 027). */
  items?: { minItems: number; maxItems: number };
}

/**
 * A component prop. `csv`: a project CSV path, parsed by the validator (ADR-0014).
 * `column`: a column of the csv prop named by `of`; `numeric` requires numbers.
 */
export interface PropContract {
  type: "string" | "boolean" | "enum" | "number" | "csv" | "column";
  enum?: string[];
  default?: string | boolean | number;
  /** For `number`: the smallest and largest allowed values, inclusive (ADR-0015). */
  min?: number;
  max?: number;
  /** For `number`: the value must be a whole number (ADR-0015). */
  integer?: boolean;
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

/** A name in the theme's type scale (`typography.scale`). */
export type ScaleName = "caption" | "body" | "subtitle" | "title";

/** The sizes a text may take, from `max` down to `min` (task 025). */
export interface TextRange {
  max: ScaleName;
  min: ScaleName;
}

/**
 * A component's text-fit rules (task 025; subtitle task 026). The top level
 * is the `default` slot's range; `subtitle`, when declared, is the range of the
 * `subtitle` slot.
 */
export interface TextFit extends TextRange {
  subtitle?: TextRange;
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
  /** Scales the `default` slot's text (and `subtitle`, if declared) within its range; absent means no scaling. */
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
  /** Legibility scrim over background footage (task 039): the background colour at this opacity. */
  scrim: { opacity: number };
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

/** A device frame (task 040, PRD §5.5): its shape, its safe content box and the tokens it draws with. */
export interface FrameContract {
  id: string;
  version: string;
  purpose: string;
  /** The frame's own shape, "width:height". */
  aspect: string;
  /** Where footage is drawn, as percentages of the frame box. */
  content: {
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
  };
  /** Theme token paths the frame draws with. */
  tokens: string[];
}
