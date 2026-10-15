// `section-divider` component (task 029; contract: packages/registry/components/section-divider.json).
// The default slot is the section title; the optional kicker sits above it (for
// example "Part 2"). A short accent rule separates them from the frame's edges.
// Colour, size and spacing come from the theme tokens (task 019). Text wraps
// inside the safe area (PRD §10.2).
import { AbsoluteFill, useVideoConfig } from "remotion";
import { useTheme } from "../../themes/ThemeProvider.js";
import { safeAreaPixels } from "../../themes/safe-area.js";

export interface SectionDividerProps {
  /** Plain text by slot name: `default` (the title), `kicker` (optional). */
  slots: Readonly<Record<string, string>>;
}

export function SectionDivider({ slots }: SectionDividerProps) {
  const theme = useTheme();
  const { width, height } = useVideoConfig();
  const margin = safeAreaPixels(theme, width, height);
  const { colors, typography, space, radius } = theme;
  const title = slots["default"] ?? "";
  const kicker = slots["kicker"] ?? "";
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
        {kicker !== "" && (
          <div
            style={{
              color: colors.accent,
              fontFamily: `${typography.fontFamily}, sans-serif`,
              fontSize: typography.scale.body,
              fontWeight: typography.weights.semibold,
              lineHeight: typography.lineHeight.body,
              marginBottom: space.sm,
              whiteSpace: "pre-line",
              maxWidth: "100%",
            }}
          >
            {kicker}
          </div>
        )}
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
        <div
          style={{
            backgroundColor: colors.accent,
            borderRadius: radius.sm,
            height: space.xs,
            marginTop: space.md,
            width: space.lg * 2,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}
