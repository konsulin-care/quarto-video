// Gives components the theme's tokens (PRD §10). Fonts are loaded before the
// frame is captured: delayRender holds the frame until every face is ready.
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { ThemeTokens } from "@quarto-video/registry";
import { cancelRender, continueRender, delayRender } from "remotion";
import { loadThemeFonts } from "./fonts.js";

const ThemeContext = createContext<ThemeTokens | null>(null);

export interface ThemeProviderProps {
  theme: ThemeTokens;
  children: ReactNode;
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  const [handle] = useState(() => delayRender(`loading fonts for ${theme.id}`));
  useEffect(() => {
    loadThemeFonts(theme).then(
      () => continueRender(handle),
      (error: unknown) => cancelRender(error),
    );
  }, [theme, handle]);
  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

/** The tokens of the enclosing ThemeProvider. Components never import values directly. */
export function useTheme(): ThemeTokens {
  const theme = useContext(ThemeContext);
  if (theme === null) {
    throw new Error("useTheme must be used inside a ThemeProvider");
  }
  return theme;
}
