// Registry id -> renderer implementation. Only ids listed here can render;
// render.ts rejects any other component before the browser starts.
import type { FC } from "react";
import type { IrBlock } from "@quarto-video/ir";
import { Title } from "../components/title/Title.js";
import { Image } from "../components/image/Image.js";

export interface SceneProps {
  /** Plain text of each slot the scene has, by slot name (task 024). */
  slots: Readonly<Record<string, string>>;
  /** Typed blocks of each slot, by slot name; empty for IR 0.1 (task 033). */
  blocks: Readonly<Record<string, IrBlock[]>>;
}

export const COMPONENTS: Readonly<Record<string, FC<SceneProps>>> = {
  title: Title,
  image: Image,
};
