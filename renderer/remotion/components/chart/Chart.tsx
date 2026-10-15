// `chart` component (task 035; contract: packages/registry/components/chart.json,
// ADR-0014). A bar or line chart drawn from the validated CSV table of prop
// `data`. The title sits above the plot; the value axis has ticks and a title
// with the unit; each category label and each value is drawn, so the chart
// never depends on colour. The optional `caption` slot sits under it. Colour
// and type come from the theme tokens; the frame's safe area bounds the layout.
import type { IrTable } from "@quarto-video/ir";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { useTheme } from "../../themes/ThemeProvider.js";
import { safeAreaPixels } from "../../themes/safe-area.js";
import { seriesOf } from "./data.js";
import { layoutPlot, type Plot } from "./layout.js";
import { Bars, Line } from "./Marks.js";
import { niceScale } from "./scale.js";

export interface ChartProps {
  /** Plain text of each slot: `caption` (optional). */
  slots: Readonly<Record<string, string>>;
  /** The authored props, as written (ADR-0014). */
  props: Readonly<Record<string, string>>;
  /** The parsed CSV tables by prop name (ADR-0014). */
  tables: Readonly<Record<string, IrTable>>;
}

/** The tick labels of the value axis, and the widest one in pixels. */
function ticksOf(values: number[], font: number) {
  const scale = niceScale(values);
  const labels = scale.ticks.map((tick) => String(tick));
  const widest = Math.max(0, ...labels.map((label) => label.length));
  return { scale, labels, width: widest * font * 0.56 };
}

/** The axis: gridlines, tick labels, the unit title, and the category labels. */
function Axes({
  plot,
  ticks,
  tickLabels,
  yTitle,
  categories,
  font,
  ink,
  muted,
}: {
  plot: Plot;
  ticks: number[];
  tickLabels: string[];
  yTitle: string;
  categories: string[];
  font: number;
  ink: string;
  muted: string;
}) {
  return (
    <g>
      <text x={0} y={font * 1.1} style={{ fill: muted, fontSize: font }}>
        {yTitle}
      </text>
      {ticks.map((tick, index) => {
        const y = plot.yOf(tick);
        return (
          <g key={`tick-${index}`}>
            <line
              x1={plot.left}
              x2={plot.right}
              y1={y}
              y2={y}
              stroke={muted}
              strokeOpacity={0.3}
              strokeWidth={font * 0.07}
            />
            <text
              x={plot.left - font * 0.4}
              y={y + font * 0.35}
              textAnchor="end"
              style={{ fill: muted, fontSize: font }}
            >
              {tickLabels[index]}
            </text>
          </g>
        );
      })}
      {categories.map((label, index) => {
        const x = plot.xOf(index);
        if (plot.rotated) {
          const y = plot.bottom + font * 0.9;
          return (
            <text
              key={`cat-${index}`}
              x={x}
              y={y}
              textAnchor="end"
              transform={`rotate(-35 ${x} ${y})`}
              style={{ fill: ink, fontSize: font }}
            >
              {label}
            </text>
          );
        }
        return (
          <text
            key={`cat-${index}`}
            x={x}
            y={plot.bottom + font * 1.5}
            textAnchor="middle"
            style={{ fill: ink, fontSize: font }}
          >
            {label}
          </text>
        );
      })}
    </g>
  );
}

export function Chart({ slots, props, tables }: ChartProps) {
  const theme = useTheme();
  const { width, height } = useVideoConfig();
  const margin = safeAreaPixels(theme, width, height);
  const { colors, typography, space, radius } = theme;
  const family = `${typography.fontFamily}, sans-serif`;
  const caption = slots["caption"] ?? "";
  const title = props["title"] ?? "";
  const font = typography.scale.caption;
  const titleBlock =
    typography.scale.subtitle * typography.lineHeight.tight + space.md;
  const captionBlock =
    caption === ""
      ? 0
      : typography.scale.body * typography.lineHeight.body + space.sm;
  const svgWidth = width - margin.x * 2;
  const svgHeight = height - margin.y * 2 - titleBlock - captionBlock;

  const table = tables["data"];
  const series =
    table === undefined
      ? undefined
      : seriesOf(
          table,
          props["x"] ?? "",
          props["y"] ?? "",
          props["unit"] ?? "",
        );
  const axis = ticksOf(series?.points.map((p) => p.value) ?? [0], font);
  const plot = layoutPlot({
    width: svgWidth,
    height: svgHeight,
    font,
    tickWidth: axis.width,
    labels: series?.points.map((p) => p.label) ?? [],
    scale: axis.scale,
  });

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
        }}
      >
        <div
          style={{
            color: colors.text,
            fontFamily: family,
            fontSize: typography.scale.subtitle,
            fontWeight: typography.weights.bold,
            lineHeight: typography.lineHeight.tight,
            textAlign: "center",
            marginBottom: space.md,
          }}
        >
          {title}
        </div>
        {series !== undefined && (
          <svg
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            style={{
              display: "block",
              fontFamily: family,
              overflow: "visible",
            }}
            role="img"
          >
            <title>{title}</title>
            <desc>
              {series.yTitle}:{" "}
              {series.points.map((p) => `${p.label} ${p.text}`).join(", ")}
            </desc>
            <Axes
              plot={plot}
              ticks={axis.scale.ticks}
              tickLabels={axis.labels}
              yTitle={series.yTitle}
              categories={series.points.map((p) => p.label)}
              font={font}
              ink={colors.text}
              muted={colors.mutedText}
            />
            {props["type"] === "line" ? (
              <Line
                plot={plot}
                points={series.points}
                font={font}
                fill={colors.accent}
                ink={colors.text}
                radius={radius.sm}
              />
            ) : (
              <Bars
                plot={plot}
                points={series.points}
                font={font}
                fill={colors.accent}
                ink={colors.text}
                radius={radius.sm}
              />
            )}
          </svg>
        )}
        {caption !== "" && (
          <div
            style={{
              color: colors.mutedText,
              fontFamily: family,
              fontSize: typography.scale.body,
              lineHeight: typography.lineHeight.body,
              marginTop: space.sm,
              textAlign: "center",
            }}
          >
            {caption}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}
