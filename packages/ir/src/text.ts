// Plain text of scene content, for renderers that show text only (task 012).
// Both IR versions are accepted: 0.1 holds one text, 0.2 holds slots of blocks.
import type { IrBlock, IrContentV02, IrInline } from "./content-types.js";
import type { IrContentV01 } from "./types.js";

/** The text of a scene's content: `default` slot blocks, one per line. */
export function plainText(content: IrContentV01 | IrContentV02): string {
  if ("text" in content) return content.text;
  const blocks = content.slots["default"] ?? [];
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
