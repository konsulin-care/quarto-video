// Registry id -> renderer implementation. Only ids listed here can render;
// render.ts rejects any other component before the browser starts.
import type { FC } from "react";
import type { IrBlock, IrTable } from "@quarto-video/ir";
import { Chart } from "../components/chart/Chart.js";
import { SectionDivider } from "../components/section-divider/SectionDivider.js";
import { Statement } from "../components/statement/Statement.js";
import { Title } from "../components/title/Title.js";
import { Bullets } from "../components/bullets/Bullets.js";
import { Comparison } from "../components/comparison/Comparison.js";
import { EndCard } from "../components/end-card/EndCard.js";
import { Image } from "../components/image/Image.js";

export interface SceneProps {
  /** Plain text of each slot the scene has, by slot name (task 024). */
  slots: Readonly<Record<string, string>>;
  /** The slots' blocks, for components that draw inline emphasis (task 025). IR 0.1 has none. */
  blocks: Readonly<Record<string, IrBlock[]>>;
  /** The scene's authored props, as written (task 035, ADR-0014). */
  props: Readonly<Record<string, string | number>>;
  /** The parsed CSV tables by prop name, from the validator (ADR-0014). */
  tables: Readonly<Record<string, IrTable>>;
}

export const COMPONENTS: Readonly<Record<string, FC<SceneProps>>> = {
  chart: Chart,
  "section-divider": SectionDivider,
  statement: Statement,
  comparison: Comparison,
  title: Title,
  "end-card": EndCard,
  bullets: Bullets,
  image: Image,
};
