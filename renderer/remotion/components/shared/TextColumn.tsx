// Text in one box of the canvas (task 042, shared with split-screen task 043): the
// largest size of `fit` at which the text fits the box (fitText, the geometry the
// validator also fits with), wrapped inside it and centred vertically. Colours
// and sizes come from the theme tokens.
import type { TextFit } from "@quarto-video/registry";
import { fitText, type Rect } from "@quarto-video/registry/layout";
import { useTheme } from "../../themes/ThemeProvider.js";

export interface TextColumnProps {
  /** The text to draw; line breaks are kept. */
  text: string;
  /** The box, in output pixels of the canvas. */
  box: Rect;
  /** The type-scale range the text is fitted in. */
  fit: TextFit;
}

export function TextColumn({ text, box, fit }: TextColumnProps) {
  const theme = useTheme();
  const { fontPx } = fitText(text, box, theme, fit);
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
