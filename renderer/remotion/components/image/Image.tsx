// `image` component (task 033; contract: packages/registry/components/image.json).
// The default slot holds one image block (ADR-0013). The picture fills the
// safe area above an optional caption, framed by its `fit` (media/fit.ts).
// The alt text is metadata in the IR and is not drawn. Colour, size and spacing
// come from the theme tokens (task 019). The caption wraps inside the safe area.
import type { IrBlock } from "@quarto-video/ir";
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { useTheme } from "../../themes/ThemeProvider.js";
import { safeAreaPixels } from "../../themes/safe-area.js";
import { fitStyle } from "../../media/fit.js";

export interface ImageProps {
  /** Plain text by slot name: `caption` (optional). */
  slots: Readonly<Record<string, string>>;
  /** Typed blocks by slot name; `default` holds the image block. */
  blocks: Readonly<Record<string, IrBlock[]>>;
}

type ImageBlock = Extract<IrBlock, { type: "image" }>;

export function Image({ slots, blocks }: ImageProps) {
  const theme = useTheme();
  const { width, height } = useVideoConfig();
  const margin = safeAreaPixels(theme, width, height);
  const { colors, typography, space, radius } = theme;
  const picture = (blocks["default"] ?? []).find(
    (block): block is ImageBlock => block.type === "image",
  );
  const caption = slots["caption"] ?? "";
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
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          height: "100%",
          minHeight: 0,
        }}
      >
        {picture !== undefined && (
          <div
            style={{
              position: "relative",
              flex: 1,
              minHeight: 0,
              width: "100%",
              overflow: "hidden",
              borderRadius: radius.md,
              backgroundColor: colors.surface,
            }}
          >
            <Img
              src={staticFile(picture.src)}
              alt={picture.alt}
              style={{
                ...fitStyle(picture.fit),
                position: "absolute",
                top: 0,
                left: 0,
              }}
            />
          </div>
        )}
        {caption !== "" && (
          <div
            style={{
              color: colors.mutedText,
              fontFamily: `${typography.fontFamily}, sans-serif`,
              fontSize: typography.scale.subtitle,
              fontWeight: typography.weights.regular,
              lineHeight: typography.lineHeight.body,
              marginTop: space.sm,
              maxWidth: "100%",
              flexShrink: 0,
              textAlign: "center",
              whiteSpace: "pre-line",
            }}
          >
            {caption}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}
