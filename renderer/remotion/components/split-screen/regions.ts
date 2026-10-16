// The regions a split-screen scene draws (task 043; ADR-0016), pure so the
// layout test needs no browser. A region is drawn when it has text or footage;
// the drawn regions take the columns of the canvas in REGION_ORDER.
import { REGION_ORDER } from "@quarto-video/registry/layout";

/** The region names drawn, left to right: those with text or with footage. */
export function drawnRegions(
  texts: Readonly<Record<string, string>>,
  footage: Readonly<Record<string, unknown>>,
): string[] {
  return REGION_ORDER.filter(
    (name) => (texts[name] ?? "") !== "" || footage[name] !== undefined,
  );
}
