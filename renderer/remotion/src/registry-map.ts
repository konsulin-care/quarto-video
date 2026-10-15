// Registry id -> renderer implementation. Only ids listed here can render;
// render.ts rejects any other component before the browser starts.
import type { FC } from "react";
import type { IrBlock } from "@quarto-video/ir";
import { Statement } from "../components/statement/Statement.js";
import { Title } from "../components/title/Title.js";

export interface SceneProps {
  /** Plain text of each slot the scene has, by slot name (task 024). */
  slots: Readonly<Record<string, string>>;
  /** The slots' blocks, for components that draw inline emphasis (task 025). IR 0.1 has none. */
  blocks: Readonly<Record<string, IrBlock[]>>;
}

export const COMPONENTS: Readonly<Record<string, FC<SceneProps>>> = {
  statement: Statement,
  title: Title,
};
