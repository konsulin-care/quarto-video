// The shared `fit` of picture media (task 033; PRD §5.4, "cover and contain must
// be consistent across image and video components"). `cover` fills the box and
// may crop; `contain` shows the whole picture inside the box. Image and, later,
// video call this one function, so the two framings cannot drift apart.
import type { CSSProperties } from "react";

/** How a picture fills its box. The IR and the DSL use these two names only. */
export type MediaFit = "cover" | "contain";

/** The fit when an author gives none (ADR-0013): nothing is cropped. */
export const DEFAULT_FIT: MediaFit = "contain";

/** The CSS that frames a picture of `fit` inside a box of the same size. */
export function fitStyle(fit: MediaFit): CSSProperties {
  return {
    objectFit: fit,
    width: "100%",
    height: "100%",
    display: "block",
  };
}
