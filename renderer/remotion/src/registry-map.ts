// Registry id -> renderer implementation. Only ids listed here can render;
// render.ts rejects any other component before the browser starts.
import type { FC } from "react";
import type { IrTable } from "@quarto-video/ir";
import { Chart } from "../components/chart/Chart.js";
import { Title } from "../components/title/Title.js";

export interface SceneProps {
  /** Plain text of each slot the scene has, by slot name (task 024). */
  slots: Readonly<Record<string, string>>;
  /** The scene's authored props, as written (task 035, ADR-0013). */
  props: Readonly<Record<string, string>>;
  /** The parsed CSV tables by prop name, from the validator (ADR-0013). */
  tables: Readonly<Record<string, IrTable>>;
}

export const COMPONENTS: Readonly<Record<string, FC<SceneProps>>> = {
  chart: Chart,
  title: Title,
};
