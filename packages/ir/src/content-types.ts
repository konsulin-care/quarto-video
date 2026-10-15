// Content nodes of IR 0.2 (schema/ir-0.2.json; ADR-0004). Hand-written; tests
// check them against the schema. Plain data only: no renderer types.

export type IrQuote = "double" | "single";

export type IrInline =
  | { type: "text"; text: string }
  | { type: "strong"; inlines: IrInline[] }
  | { type: "emphasis"; inlines: IrInline[] }
  | { type: "quoted"; quote: IrQuote; inlines: IrInline[] }
  | { type: "code"; text: string }
  | { type: "line-break" };

export interface IrListItem {
  blocks: IrBlock[];
}

/** An image block (IR 1.3, ADR-0013): a local file, its framing and its alt text. */
export interface IrImageBlock {
  type: "image";
  /** Project-relative path of the image file (ADR-0006). */
  src: string;
  fit: IrImageFit;
  /** Accessibility text; "" marks a decorative image. */
  alt: string;
}

export type IrImageFit = "cover" | "contain";

export type IrBlock =
  | { type: "paragraph"; inlines: IrInline[] }
  | { type: "heading"; level: number; inlines: IrInline[] }
  | { type: "list"; ordered: boolean; items: IrListItem[] }
  | { type: "code-block"; text: string; language?: string }
  | IrImageBlock;

/** Scene content of IR 0.2: blocks by slot name. `default` holds loose content. */
export interface IrContentV02 {
  slots: Record<string, IrBlock[]>;
}
