// Registry id -> renderer implementation. Only ids listed here can render;
// render.ts rejects any other component before the browser starts.
import type { FC } from "react";
import type { IrBlock } from "@quarto-video/ir";
import { SectionDivider } from "../components/section-divider/SectionDivider.js";
import { Statement } from "../components/statement/Statement.js";
import { Title } from "../components/title/Title.js";
import { Comparison } from "../components/comparison/Comparison.js";
import { EndCard } from "../components/end-card/EndCard.js";

export interface SceneProps {
  /** Plain text of each slot the scene has, by slot name (task 024). */
  slots: Readonly<Record<string, string>>;
  /** The slots' blocks, for components that draw inline emphasis (task 025). IR 0.1 has none. */
  blocks: Readonly<Record<string, IrBlock[]>>;
}

export const COMPONENTS: Readonly<Record<string, FC<SceneProps>>> = {
  "section-divider": SectionDivider,
  statement: Statement,
  comparison: Comparison,
  title: Title,
  "end-card": EndCard,
};
