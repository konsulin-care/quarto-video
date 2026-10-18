// Text in one box of the canvas (task 042, shared with split-screen task 043): the
// text at the font size its caller fits (fitText or sharedTextPx), wrapped inside
// the box and centred vertically. Colours and sizes come from the theme tokens.
import type { Rect } from "@quarto-video/registry/layout";
import { useTheme } from "../../themes/ThemeProvider.js";

export interface TextColumnProps {
  /** The text to draw; line breaks are kept. */
  text: string;
  /** The box, in output pixels of the canvas. */
  box: Rect;
  /** The font size in px, already fitted to the box by the caller. */
  fontPx: number;
}

export function TextColumn({ text, box, fontPx }: TextColumnProps) {
  const theme = useTheme();
  const { colors, typography } = theme;
  return (
    <div
      style={{
        position: "absolute",
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        color: colors.text,
        fontFamily: `${typography.fontFamily}, sans-serif`,
        fontSize: fontPx,
        fontWeight: typography.weights.semibold,
        lineHeight: typography.lineHeight.tight,
        textAlign: "left",
        overflowWrap: "break-word",
        whiteSpace: "pre-line",
      }}
    >
      {text}
    </div>
  );
}
