// Registry id -> renderer implementation. Only ids listed here can render;
// render.ts rejects any other component before the browser starts.
import type { FC } from "react";
import { Title } from "../components/title/Title.js";

export interface SceneProps {
  text: string;
}

export const COMPONENTS: Readonly<Record<string, FC<SceneProps>>> = {
  title: Title,
};
