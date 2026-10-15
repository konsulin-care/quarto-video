// Registry id -> renderer implementation. Only ids listed here can render;
// render.ts rejects any other component before the browser starts.
import type { FC } from "react";
import { Title } from "../components/title/Title.js";
import { Bullets } from "../components/bullets/Bullets.js";

export interface SceneProps {
  /** Plain text of each slot the scene has, by slot name (task 024). */
  slots: Readonly<Record<string, string>>;
}

export const COMPONENTS: Readonly<Record<string, FC<SceneProps>>> = {
  title: Title,
  bullets: Bullets,
};
