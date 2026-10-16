// Bundled font files for each theme font family (PRD §12: no network at render
// time). Files are committed under themes/fonts/ with their LICENSE (OFL-1.1).
import type { ThemeTokens } from "@quarto-video/registry";
// new URL(..., import.meta.url) makes the bundler emit each file as an asset, and
// lets Node (render.ts imports this module through registry-map) load it as a URL.
const inter400 = new URL(
  "./fonts/inter-latin-400-normal.woff2",
  import.meta.url,
).href;
const inter600 = new URL(
  "./fonts/inter-latin-600-normal.woff2",
  import.meta.url,
).href;
const inter700 = new URL(
  "./fonts/inter-latin-700-normal.woff2",
  import.meta.url,
).href;

/** Family name -> weight -> bundled file URL. */
export const FONT_FILES: Readonly<
  Record<string, Readonly<Record<number, string>>>
> = {
  Inter: { 400: inter400, 600: inter600, 700: inter700 },
};

/** Registers every weight of the theme's family with the page, then resolves. */
export async function loadThemeFonts(theme: ThemeTokens): Promise<void> {
  const family = theme.typography.fontFamily;
  const files = FONT_FILES[family];
  if (files === undefined) {
    throw new Error(`no bundled font files for "${family}"`);
  }
  for (const weight of Object.values(theme.typography.weights)) {
    const url = files[weight];
    if (url === undefined) {
      throw new Error(`no bundled "${family}" file for weight ${weight}`);
    }
    const face = new FontFace(family, `url(${url})`, {
      weight: String(weight),
    });
    await face.load();
    document.fonts.add(face);
  }
}
