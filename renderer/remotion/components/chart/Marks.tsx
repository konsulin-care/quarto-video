// The marks of a chart (task 035): bars or a line with markers. Each mark has
// its value printed beside it, so the numbers never depend on colour. Colours
// and text styles come from the theme tokens, passed in by Chart.tsx.
import type { Plot } from "./layout.js";
import type { Point } from "./data.js";

export interface MarksProps {
  plot: Plot;
  points: readonly Point[];
  /** The theme caption size: value labels and marker sizes scale from it. */
  font: number;
  /** The series colour (the theme accent). */
  fill: string;
  /** The value label colour (the theme text token). */
  ink: string;
  /** The theme's small corner radius for bar ends. */
  radius: number;
}

/** Bars from zero, each with its value above (or below, for a negative value). */
export function Bars({ plot, points, font, fill, ink, radius }: MarksProps) {
  const zero = plot.yOf(0);
  const barWidth = plot.slot * 0.5;
  return (
    <g>
      {points.map((point, index) => {
        const x = plot.xOf(index);
        const end = plot.yOf(point.value);
        const positive = point.value >= 0;
        return (
          <g key={index}>
            <rect
              x={x - barWidth / 2}
              y={Math.min(end, zero)}
              width={barWidth}
              height={Math.abs(end - zero)}
              rx={radius}
              fill={fill}
            />
            <text
              x={x}
              y={positive ? end - font * 0.4 : end + font * 1.1}
              textAnchor="middle"
              style={{ fill: ink, fontSize: font }}
            >
              {point.text}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** A line through the points, with a marker on each and its value above it. */
export function Line({ plot, points, font, fill, ink }: MarksProps) {
  const coords = points.map((point, index) => ({
    x: plot.xOf(index),
    y: plot.yOf(point.value),
  }));
  const path = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const marker = font * 0.25;
  return (
    <g>
      <polyline
        points={path}
        fill="none"
        stroke={fill}
        strokeWidth={font * 0.14}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((point, index) => {
        const c = coords[index] ?? { x: 0, y: 0 };
        return (
          <g key={index}>
            <circle cx={c.x} cy={c.y} r={marker} fill={fill} />
            <text
              x={c.x}
              y={c.y - font * 0.7}
              textAnchor="middle"
              style={{ fill: ink, fontSize: font }}
            >
              {point.text}
            </text>
          </g>
        );
      })}
    </g>
  );
}
