// `bullets` component (task 027; contract: packages/registry/components/bullets.json).
// The default slot is one list: the renderer gets its items as plain lines
// (ir/text `slotTexts`), one line per item, in order. The optional heading sits
// above the list. Colour, size and spacing come from the theme tokens (task
// 019). Items wrap inside the safe area (PRD §10.2).
import { AbsoluteFill, useVideoConfig } from "remotion";
import { useTheme } from "../../themes/ThemeProvider.js";
import { safeAreaPixels } from "../../themes/safe-area.js";
import {
  itemStyle,
  useStaggerMotion,
} from "../../animations/stagger-motion.js";

export interface BulletsProps {
  /** Plain text by slot name: `default` (the list, one line per item), `heading` (optional). */
  slots: Readonly<Record<string, string>>;
}

export function Bullets({ slots }: BulletsProps) {
  const theme = useTheme();
  const { width, height } = useVideoConfig();
  const margin = safeAreaPixels(theme, width, height);
  const { colors, typography, space } = theme;
  const family = `${typography.fontFamily}, sans-serif`;
  const heading = slots["heading"] ?? "";
  const list = slots["default"] ?? "";
  const items = list === "" ? [] : list.split("\n");
  // stagger reveals the items one after another (task 028); none draws them as they are.
  const motion = useStaggerMotion();
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
          width: "100%",
          minWidth: 0,
        }}
      >
        {heading !== "" && (
          <div
            style={{
              color: colors.text,
              fontFamily: family,
              fontSize: typography.scale.subtitle,
              fontWeight: typography.weights.bold,
              lineHeight: typography.lineHeight.tight,
              marginBottom: space.md,
              whiteSpace: "pre-line",
            }}
          >
            {heading}
          </div>
        )}
        <div
          style={{ display: "flex", flexDirection: "column", gap: space.sm }}
        >
          {items.map((item, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: space.sm,
                minWidth: 0,
                ...itemStyle(motion, index, items.length),
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  color: colors.accent,
                  fontFamily: family,
                  fontSize: typography.scale.body,
                  fontWeight: typography.weights.bold,
                  lineHeight: typography.lineHeight.body,
                  flexShrink: 0,
                }}
              >
                {"•"}
              </span>
              <div
                style={{
                  color: colors.text,
                  fontFamily: family,
                  fontSize: typography.scale.body,
                  fontWeight: typography.weights.regular,
                  lineHeight: typography.lineHeight.body,
                  minWidth: 0,
                  overflowWrap: "anywhere",
                  whiteSpace: "pre-line",
                }}
              >
                {item}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}
