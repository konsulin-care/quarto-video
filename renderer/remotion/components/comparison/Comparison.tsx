// `comparison` component (task 034; contract: packages/registry/components/comparison.json).
// Two areas (left, right) side by side, or three with the optional middle slot.
// Each area is a surface panel of plain text. The panels share one top edge, so
// unequal lengths stay aligned at the top. Colour, size and spacing come from the
// theme tokens (task 019). Text wraps inside the safe area (PRD §10.2).
import { AbsoluteFill, useVideoConfig } from "remotion";
import { useTheme } from "../../themes/ThemeProvider.js";
import { safeAreaPixels } from "../../themes/safe-area.js";

export interface ComparisonProps {
  /** Plain text by slot name: `left`, `right` (required), `middle` (optional). */
  slots: Readonly<Record<string, string>>;
}

export function Comparison({ slots }: ComparisonProps) {
  const theme = useTheme();
  const { width, height } = useVideoConfig();
  const margin = safeAreaPixels(theme, width, height);
  const { colors, typography, space, radius } = theme;
  // The middle column exists only when the scene has text for it.
  const areas = ["left", "middle", "right"].filter(
    (name) => name !== "middle" || (slots["middle"] ?? "") !== "",
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
          display: "grid",
          gridTemplateColumns: `repeat(${areas.length}, minmax(0, 1fr))`,
          columnGap: space.lg,
          alignItems: "start",
          width: "100%",
        }}
      >
        {areas.map((name) => (
          <div
            key={name}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              padding: space.md,
              color: colors.text,
              fontFamily: `${typography.fontFamily}, sans-serif`,
              fontSize: typography.scale.body,
              fontWeight: typography.weights.regular,
              lineHeight: typography.lineHeight.body,
              whiteSpace: "pre-line",
              overflowWrap: "break-word",
              minWidth: 0,
            }}
          >
            {slots[name] ?? ""}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}
