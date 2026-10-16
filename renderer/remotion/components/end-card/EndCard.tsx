// `end-card` component (task 030; contract: packages/registry/components/end-card.json).
// The default slot is the closing message, centred in the free space of the safe
// area. The optional cta slot sits under it in the accent colour; the optional
// credits slot (one line per list item) sits along the bottom in the muted colour.
// Credits take at most CREDITS_SHARE of the safe-area height: a longer list is set
// smaller so it fits, never clipped. Colour, size and spacing come from the theme.
import { AbsoluteFill, useVideoConfig } from "remotion";
import { useTheme } from "../../themes/ThemeProvider.js";
import { safeAreaPixels } from "../../themes/safe-area.js";
import {
  itemStyle,
  useStaggerMotion,
} from "../../animations/stagger-motion.js";

export interface EndCardProps {
  /** Plain text by slot name: `default` (message), `cta` and `credits` (optional). */
  slots: Readonly<Record<string, string>>;
}

/** Share of the safe-area height the credits may take. */
export const CREDITS_SHARE = 0.5;

/**
 * Font size in px for `lines` credit lines to fit in `budget` px of height:
 * the preferred size when they fit, otherwise the largest size that does.
 */
export function creditsFontSize(
  preferred: number,
  lineHeight: number,
  lines: number,
  budget: number,
): number {
  if (lines <= 0) return preferred;
  const fit = Math.floor(budget / (lines * lineHeight));
  return Math.max(1, Math.min(preferred, fit));
}

export function EndCard({ slots }: EndCardProps) {
  const theme = useTheme();
  const { width, height } = useVideoConfig();
  const margin = safeAreaPixels(theme, width, height);
  const { colors, typography, space } = theme;
  const font = `${typography.fontFamily}, sans-serif`;
  const message = slots["default"] ?? "";
  const cta = slots["cta"] ?? "";
  const credits = (slots["credits"] ?? "")
    .split("\n")
    .filter((line) => line !== "");
  // stagger reveals the credit lines one after another (task 028); none draws the block.
  const motion = useStaggerMotion();
  const budget = (height - 2 * margin.y) * CREDITS_SHARE;
  const creditsSize = creditsFontSize(
    typography.scale.caption,
    typography.lineHeight.body,
    credits.length,
    budget,
  );
  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingLeft: margin.x,
        paddingRight: margin.x,
        paddingTop: margin.y,
        paddingBottom: margin.y,
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          maxWidth: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: colors.text,
            fontFamily: font,
            fontSize: typography.scale.title,
            fontWeight: typography.weights.bold,
            lineHeight: typography.lineHeight.tight,
            whiteSpace: "pre-line",
            maxWidth: "100%",
          }}
        >
          {message}
        </div>
        {cta !== "" && (
          <div
            style={{
              color: colors.accent,
              fontFamily: font,
              fontSize: typography.scale.subtitle,
              fontWeight: typography.weights.semibold,
              lineHeight: typography.lineHeight.body,
              marginTop: space.md,
              whiteSpace: "pre-line",
              maxWidth: "100%",
            }}
          >
            {cta}
          </div>
        )}
      </div>
      {credits.length > 0 && (
        <div
          style={{
            color: colors.mutedText,
            fontFamily: font,
            fontSize: creditsSize,
            fontWeight: typography.weights.regular,
            lineHeight: typography.lineHeight.body,
            marginTop: space.sm,
            textAlign: "center",
            whiteSpace: "pre-line",
            maxWidth: "100%",
            flexShrink: 0,
          }}
        >
          {motion === undefined
            ? credits.join("\n")
            : credits.map((line, index) => (
                <div
                  key={index}
                  style={itemStyle(motion, index, credits.length)}
                >
                  {line}
                </div>
              ))}
        </div>
      )}
    </AbsoluteFill>
  );
}
