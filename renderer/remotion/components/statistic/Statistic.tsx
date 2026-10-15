// `statistic` component (task 031; contract: packages/registry/components/statistic.json,
// ADR-0015). A headline number, with its label and optional context under it.
// The value is formatted by `formatNumber` (locale-fixed, documented in
// docs/components/statistic.md); the optional prefix comes before it and the
// optional unit after it, smaller and muted. The number takes the largest size
// up to twice the title size that fits the safe-area width (size.ts). Colours
// and sizes come from the theme tokens (task 019); text wraps inside the safe area.
import { safeAreaPixels, safeBox } from "@quarto-video/registry/layout";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { countedValue, useCountMotion } from "../../animations/count-motion.js";
import { useTheme } from "../../themes/ThemeProvider.js";
import { formatNumber } from "./format.js";
import { UNIT_SCALE, numberFontPx } from "./size.js";

export interface StatisticProps {
  /** Plain text by slot name: `label` (required), `context` (optional). */
  slots: Readonly<Record<string, string>>;
  /** The number props (ADR-0015): `value` and `decimals` are numbers; `prefix` and `unit` text. */
  props: Readonly<Record<string, string | number>>;
}

/** A text prop by name; a number reads as absent (only `value` and `decimals` are numbers). */
function textProp(props: StatisticProps["props"], name: string): string {
  const value = props[name];
  return typeof value === "string" ? value : "";
}

export function Statistic({ slots, props }: StatisticProps) {
  const theme = useTheme();
  const { width, height } = useVideoConfig();
  const margin = safeAreaPixels(theme, width, height);
  const { colors, typography, space } = theme;
  const value = props["value"];
  if (typeof value !== "number") {
    throw new Error(
      "statistic: the value prop must be a number (validated IR)",
    );
  }
  const decimals =
    typeof props["decimals"] === "number" ? props["decimals"] : 0;
  const prefix = textProp(props, "prefix");
  const unit = textProp(props, "unit");
  // The number drawn now: the counted value under count-up (task 032), else the value.
  const count = useCountMotion();
  const digits = formatNumber(countedValue(count, value), decimals);
  // The sign comes before the prefix: "-$3.5", not "$-3.5".
  const sign = digits.startsWith("-") ? "-" : "";
  const magnitude = digits.slice(sign.length);
  // The size is that of the final text, so the number keeps its size while it counts.
  const finalDigits = formatNumber(value, decimals).replace(/^-/, "");
  const size = numberFontPx(
    { prefix, digits: finalDigits, unit },
    safeBox(theme, width, height).width,
    typography.scale.title * 2,
    typography.scale.body,
  );
  const family = `${typography.fontFamily}, sans-serif`;
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
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            maxWidth: "100%",
            color: colors.text,
            fontFamily: family,
            fontWeight: typography.weights.bold,
            lineHeight: typography.lineHeight.tight,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: size }}>{`${sign}${prefix}`}</span>
          <span style={{ fontSize: size }}>{magnitude}</span>
          {unit !== "" && (
            <span
              style={{
                fontSize: size * UNIT_SCALE,
                color: colors.mutedText,
                marginLeft: space.xs,
                fontWeight: typography.weights.semibold,
              }}
            >
              {unit}
            </span>
          )}
        </div>
        <div
          style={{
            color: colors.text,
            fontFamily: family,
            fontSize: typography.scale.subtitle,
            fontWeight: typography.weights.regular,
            lineHeight: typography.lineHeight.body,
            marginTop: space.md,
            whiteSpace: "pre-line",
            overflowWrap: "break-word",
            maxWidth: "100%",
          }}
        >
          {slots["label"] ?? ""}
        </div>
        {(slots["context"] ?? "") !== "" && (
          <div
            style={{
              color: colors.mutedText,
              fontFamily: family,
              fontSize: typography.scale.body,
              fontWeight: typography.weights.regular,
              lineHeight: typography.lineHeight.body,
              marginTop: space.sm,
              whiteSpace: "pre-line",
              overflowWrap: "break-word",
              maxWidth: "100%",
            }}
          >
            {slots["context"]}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}
