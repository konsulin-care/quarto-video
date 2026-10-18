// A scene's text for the components (task 039). `text-overlay` holds the text
// drawn over background footage. The registry makes it an alternative of
// `default` (exclusive, checked by the validator), so when `default` is empty it
// stands in for `default`: the components read `default` alone.
import type { IrBlock } from "@quarto-video/ir";

export interface SceneContent {
  /** Plain text by slot name, with `text-overlay` as `default` when that is empty. */
  texts: Record<string, string>;
  /** Blocks by slot name, with `text-overlay` as `default` when that is empty. */
  blocks: Record<string, IrBlock[]>;
}

export function withOverlay(
  texts: Readonly<Record<string, string>>,
  blocks: Readonly<Record<string, IrBlock[]>>,
): SceneContent {
  const overlay = texts["text-overlay"];
  if (overlay === undefined || (texts["default"] ?? "") !== "") {
    return { texts: { ...texts }, blocks: { ...blocks } };
  }
  return {
    texts: { ...texts, default: overlay },
    blocks: { ...blocks, default: blocks["text-overlay"] ?? [] },
  };
}
