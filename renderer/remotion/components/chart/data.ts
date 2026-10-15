// Chart data: the rows of a validated CSV table as points (task 035, ADR-0013).
// The validator has checked that the columns exist and that the y column holds
// numbers, so the renderer only reads them.
import type { IrTable } from "@quarto-video/ir";

export interface Point {
  /** The x cell: the category label, drawn under the mark. */
  label: string;
  /** The y cell as a number. */
  value: number;
  /** The y cell as written; it is the value label beside the mark. */
  text: string;
}

export interface Series {
  points: Point[];
  /** The y column's name with its unit, e.g. "bandwidth (GB/s)". */
  yTitle: string;
}

/** The series of a chart: x labels and y values in CSV row order. */
export function seriesOf(
  table: IrTable,
  x: string,
  y: string,
  unit: string,
): Series {
  const xIndex = table.columns.indexOf(x);
  const yIndex = table.columns.indexOf(y);
  return {
    points: table.rows.map((cells) => {
      const text = cells[yIndex] ?? "";
      return { label: cells[xIndex] ?? "", value: Number(text), text };
    }),
    yTitle: `${y} (${unit})`,
  };
}
