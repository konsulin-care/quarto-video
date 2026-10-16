// `statement` component (task 025; contract: packages/registry/components/statement.json).
// One prominent sentence, centred in the safe area. Its size is the largest in
// the theme's type scale, from TEXT_FIT.max down to TEXT_FIT.min, at which it
// fits (fitText, the rule the validator warns with). `strong` text takes the
// accent colour. Colours and sizes come from the theme tokens (task 019).
import type { CSSProperties, ReactNode } from "react";
import type { IrBlock, IrInline } from "@quarto-video/ir";
import type { TextFit } from "@quarto-video/registry";
import { countWords } from "@quarto-video/registry/kinetic";
import {
  fitText,
  safeAreaPixels,
  safeBox,
} from "@quarto-video/registry/layout";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { wordStyle, useWordMotion } from "../../animations/word-motion.js";
import { useTheme } from "../../themes/ThemeProvider.js";
import { newWordState, splitWords, type WordState } from "./words.js";

/** Mirrors `textFit` in statement.json; statement-fit.test.ts checks they agree. */
export const TEXT_FIT: TextFit = { max: "title", min: "body" };

export interface StatementProps {
  /** Plain text by slot name; the statement fits and sizes `default`. */
  slots: Readonly<Record<string, string>>;
  /** The slots' blocks, which keep the inline emphasis. */
  blocks: Readonly<Record<string, IrBlock[]>>;
}

/** Kinetic's walk over the statement: each word's style, and the word state. */
interface Walk {
  state: WordState;
  style: (index: number) => CSSProperties;
}

/** Text as drawn: plain, or one span per word under kinetic. */
function piecesOf(text: string, walk: Walk | undefined): ReactNode {
  if (walk === undefined) return text;
  return splitWords(text, walk.state).map((piece, index) =>
    piece.word === undefined ? (
      piece.text
    ) : (
      <span key={index} style={walk.style(piece.word)}>
        {piece.text}
      </span>
    ),
  );
}

/** The inline runs of one paragraph or heading; `strong` takes `accent`. */
function inlineNodes(
  inlines: IrInline[],
  accent: string,
  walk: Walk | undefined,
): ReactNode[] {
  return inlines.map((inline, index) => {
    switch (inline.type) {
      case "text":
        return <span key={index}>{piecesOf(inline.text, walk)}</span>;
      case "code":
        return <code key={index}>{piecesOf(inline.text, walk)}</code>;
      case "strong":
        return (
          <strong key={index} style={{ color: accent }}>
            {inlineNodes(inline.inlines, accent, walk)}
          </strong>
        );
      case "emphasis":
        return <em key={index}>{inlineNodes(inline.inlines, accent, walk)}</em>;
      case "quoted": {
        const mark = inline.quote === "double" ? '"' : "'";
        return (
          <span key={index}>
            {piecesOf(mark, walk)}
            {inlineNodes(inline.inlines, accent, walk)}
            {piecesOf(mark, walk)}
          </span>
        );
      }
      case "line-break":
        if (walk !== undefined) walk.state.inWord = false;
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
  const motion = useWordMotion();
  const count = countWords(slots["default"] ?? "");
  const walk: Walk | undefined =
    motion === undefined
      ? undefined
      : {
          state: newWordState(),
          style: (index) => ({
            display: "inline-block",
            ...wordStyle(motion, index, count),
          }),
        };
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
        {(blocks["default"] ?? []).map((block, index) => {
          if (walk !== undefined) walk.state.inWord = false;
          return block.type === "paragraph" || block.type === "heading" ? (
            <div key={index}>
              {inlineNodes(block.inlines, colors.accent, walk)}
            </div>
          ) : null;
        })}
      </div>
    </AbsoluteFill>
  );
}
