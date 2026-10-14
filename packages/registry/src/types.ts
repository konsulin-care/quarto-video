// The contract data model (packages/registry/README.md, PRD §5.5). Mirrors
// schema/contract.json; the loader checks every file against that schema.

/** Block kinds a slot may accept (ADR-0004). */
export type BlockKind = "paragraph" | "heading" | "list" | "code-block";

export interface SlotContract {
  required: boolean;
  accepts: BlockKind[];
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
