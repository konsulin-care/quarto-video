// Plain text of scene content, for renderers that show text only (task 012).
// Both IR versions are accepted: 0.1 holds one text, 0.2 holds slots of blocks.
import type { IrBlock, IrContentV02, IrInline } from "./content-types.js";
import type { IrContentV01 } from "./types.js";

/** The text of a scene's content: `default` slot blocks, one per line. */
export function plainText(content: IrContentV01 | IrContentV02): string {
  if ("text" in content) return content.text;
  return linesOf(content.slots["default"] ?? []);
}

/**
 * The text of every slot a scene has, by slot name, one line per block (task
 * 024). IR 0.1 content is its text under `default`. A slot the scene lacks is
 * absent from the result.
 */
export function slotTexts(
  content: IrContentV01 | IrContentV02,
): Record<string, string> {
  if ("text" in content) return { default: content.text };
  return Object.fromEntries(
    Object.entries(content.slots).map(([name, blocks]) => [
      name,
      linesOf(blocks),
    ]),
  );
}

function linesOf(blocks: IrBlock[]): string {
  return blocks
    .map(blockText)
    .filter((text) => text !== "")
    .join("\n");
}

function blockText(block: IrBlock): string {
  switch (block.type) {
    case "paragraph":
    case "heading":
      return inlinesText(block.inlines);
    case "list":
      return block.items
        .map((item) => item.blocks.map(blockText).join("\n"))
        .join("\n");
    case "code-block":
      return block.text;
    case "image":
      // An image has no text: its alt text is metadata, not drawn content.
      return "";
  }
}

function inlinesText(inlines: IrInline[]): string {
  return inlines.map(inlineText).join("");
}

function inlineText(inline: IrInline): string {
  switch (inline.type) {
    case "text":
    case "code":
      return inline.text;
    case "strong":
    case "emphasis":
      return inlinesText(inline.inlines);
    case "quoted": {
      const mark = inline.quote === "double" ? '"' : "'";
      return `${mark}${inlinesText(inline.inlines)}${mark}`;
    }
    case "line-break":
      return "\n";
  }
}
