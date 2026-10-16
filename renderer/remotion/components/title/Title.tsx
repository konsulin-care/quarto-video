// `title` component (task 024; contract: packages/registry/components/title.json).
// The default slot is the title; the optional subtitle slot sits under it. Both
// form one centred column, so without a subtitle the title is centred alone.
// Sizes come from the theme's type scale: each slot takes the largest size in
// its range (TEXT_FIT) at which it fits, the rule the validator warns with
// (fitStack, task 026). Colour and spacing come from the theme tokens (task 019).
// Text wraps inside the safe area (PRD §10.2).
import type { TextFit } from "@quarto-video/registry";
import {
  fitStack,
  safeAreaPixels,
  safeBox,
} from "@quarto-video/registry/layout";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { useTheme } from "../../themes/ThemeProvider.js";

/** Mirrors `textFit` in title.json; title-fit.test.ts checks they agree. */
export const TEXT_FIT: TextFit = {
  max: "title",
  min: "body",
  subtitle: { max: "subtitle", min: "body" },
};

export interface TitleProps {
  /** Plain text by slot name: `default` (the title), `subtitle` (optional). */
  slots: Readonly<Record<string, string>>;
}

export function Title({ slots }: TitleProps) {
  const theme = useTheme();
  const { width, height } = useVideoConfig();
  const margin = safeAreaPixels(theme, width, height);
  const { colors, typography, space } = theme;
  const title = slots["default"] ?? "";
  const subtitle = slots["subtitle"] ?? "";
  const fit = fitStack(
    { default: title, subtitle },
    safeBox(theme, width, height),
    theme,
    TEXT_FIT,
  );
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
          maxWidth: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: colors.text,
            fontFamily: `${typography.fontFamily}, sans-serif`,
            fontSize: fit.default.fontPx,
            fontWeight: typography.weights.bold,
            lineHeight: typography.lineHeight.tight,
            whiteSpace: "pre-line",
            overflowWrap: "break-word",
            maxWidth: "100%",
          }}
        >
          {title}
        </div>
        {subtitle !== "" && (
          <div
            style={{
              color: colors.mutedText,
              fontFamily: `${typography.fontFamily}, sans-serif`,
              fontSize: fit.subtitle?.fontPx ?? typography.scale.subtitle,
              fontWeight: typography.weights.regular,
              lineHeight: typography.lineHeight.body,
              marginTop: space.sm,
              whiteSpace: "pre-line",
              overflowWrap: "break-word",
              maxWidth: "100%",
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}
