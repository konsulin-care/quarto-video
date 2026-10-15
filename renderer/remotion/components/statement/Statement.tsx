// `statement` component (task 025; contract: packages/registry/components/statement.json).
// One prominent sentence, centred in the safe area. Its size is the largest in
// the theme's type scale, from TEXT_FIT.max down to TEXT_FIT.min, at which it
// fits (fitText, the rule the validator warns with). `strong` text takes the
// accent colour. Colours and sizes come from the theme tokens (task 019).
import type { ReactNode } from "react";
import type { IrBlock, IrInline } from "@quarto-video/ir";
import type { TextFit } from "@quarto-video/registry";
import {
  fitText,
  safeAreaPixels,
  safeBox,
} from "@quarto-video/registry/layout";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { useTheme } from "../../themes/ThemeProvider.js";

/** Mirrors `textFit` in statement.json; statement-fit.test.ts checks they agree. */
export const TEXT_FIT: TextFit = { max: "title", min: "body" };

export interface StatementProps {
  /** Plain text by slot name; the statement fits and sizes `default`. */
  slots: Readonly<Record<string, string>>;
  /** The slots' blocks, which keep the inline emphasis. */
  blocks: Readonly<Record<string, IrBlock[]>>;
}

/** The inline runs of one paragraph or heading; `strong` takes `accent`. */
function inlineNodes(inlines: IrInline[], accent: string): ReactNode[] {
  return inlines.map((inline, index) => {
    switch (inline.type) {
      case "text":
        return <span key={index}>{inline.text}</span>;
      case "code":
        return <code key={index}>{inline.text}</code>;
      case "strong":
        return (
          <strong key={index} style={{ color: accent }}>
            {inlineNodes(inline.inlines, accent)}
          </strong>
        );
      case "emphasis":
        return <em key={index}>{inlineNodes(inline.inlines, accent)}</em>;
      case "quoted": {
        const mark = inline.quote === "double" ? '"' : "'";
        return (
          <span key={index}>
            {mark}
            {inlineNodes(inline.inlines, accent)}
            {mark}
          </span>
        );
      }
      case "line-break":
        return <br key={index} />;
    }
  });
}

export function Statement({ slots, blocks }: StatementProps) {
  const theme = useTheme();
  const { width, height } = useVideoConfig();
  const margin = safeAreaPixels(theme, width, height);
  const { fontPx } = fitText(
    slots["default"] ?? "",
    safeBox(theme, width, height),
    theme,
    TEXT_FIT,
  );
  const { colors, typography } = theme;
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingLeft: margin.x,
        paddingRight: margin.x,
        paddingTop: margin.y,
        paddingBottom: margin.y,
      }}
    >
      <div
        style={{
          color: colors.text,
          fontFamily: `${typography.fontFamily}, sans-serif`,
          fontSize: fontPx,
          fontWeight: typography.weights.bold,
          lineHeight: typography.lineHeight.tight,
          textAlign: "center",
          maxWidth: "100%",
          overflowWrap: "break-word",
        }}
      >
        {(blocks["default"] ?? []).map((block, index) =>
          block.type === "paragraph" || block.type === "heading" ? (
            <div key={index}>{inlineNodes(block.inlines, colors.accent)}</div>
          ) : null,
        )}
      </div>
    </AbsoluteFill>
  );
}
