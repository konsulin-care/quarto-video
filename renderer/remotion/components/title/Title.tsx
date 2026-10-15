// `title` component (task 024; contract: packages/registry/components/title.json).
// The default slot is the title; the optional subtitle slot sits under it. Both
// form one centred column, so without a subtitle the title is centred alone.
// Colour, size and spacing come from the theme tokens (task 019). Text wraps
// inside the safe area (PRD §10.2).
import { AbsoluteFill, useVideoConfig } from "remotion";
import { useTheme } from "../../themes/ThemeProvider.js";
import { safeAreaPixels } from "../../themes/safe-area.js";

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
            fontSize: typography.scale.title,
            fontWeight: typography.weights.bold,
            lineHeight: typography.lineHeight.tight,
            whiteSpace: "pre-line",
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
              fontSize: typography.scale.subtitle,
              fontWeight: typography.weights.regular,
              lineHeight: typography.lineHeight.body,
              marginTop: space.sm,
              whiteSpace: "pre-line",
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
