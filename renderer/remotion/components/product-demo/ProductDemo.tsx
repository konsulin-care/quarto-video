// `product-demo` component (task 041; contract: packages/registry/components/product-demo.json).
// The footage in its device frame is drawn by FramedScene, which IrVideo wraps
// around this component. This component draws the optional caption in the band
// FramedScene reserved under the frame, as tall as the caption's lines need
// (media/frames/caption.ts). Colour, type and spacing come from the theme tokens
// (task 019). The caption wraps in the safe area.
import { useVideoConfig } from "remotion";
import { safeAreaPixels, safeBox } from "@quarto-video/registry/layout";
import { useTheme } from "../../themes/ThemeProvider.js";
import { captionBand } from "../../media/frames/caption.js";

export interface ProductDemoProps {
  /** Plain text by slot name: `caption` (optional). */
  slots: Readonly<Record<string, string>>;
}

export function ProductDemo({ slots }: ProductDemoProps) {
  const theme = useTheme();
  const { width, height } = useVideoConfig();
  const caption = slots["caption"] ?? "";
  if (caption === "") return null;
  const margin = safeAreaPixels(theme, width, height);
  const safe = safeBox(theme, width, height);
  const band = captionBand(theme, caption, safe.width);
  const { colors, typography, space } = theme;
  return (
    <div
      style={{
        position: "absolute",
        left: margin.x,
        top: margin.y + safe.height - band,
        width: safe.width,
        height: band,
        boxSizing: "border-box",
        paddingTop: space.sm,
        color: colors.mutedText,
        fontFamily: `${typography.fontFamily}, sans-serif`,
        fontSize: typography.scale.caption,
        fontWeight: typography.weights.regular,
        lineHeight: typography.lineHeight.body,
        textAlign: "center",
        whiteSpace: "pre-line",
      }}
    >
      {caption}
    </div>
  );
}
