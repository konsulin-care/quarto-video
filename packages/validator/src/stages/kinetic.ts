// Stage 2 kinetic warning (PRD §5.6; task 026): a statement with more words than
// KINETIC_MAX_WORDS is drawn with fade-in instead of word by word. That is a
// warning (W_ANIMATION_FALLBACK), not an error: the scene still renders. The
// count is the renderer's (registry/kinetic), so both agree. Pure.
import type { IrVideo } from "@quarto-video/ir";
import { slotTexts } from "@quarto-video/ir/text";
import { KINETIC_MAX_WORDS, countWords } from "@quarto-video/registry/kinetic";
import type { Diagnostic } from "../diagnostic.js";

/** Every W_ANIMATION_FALLBACK warning in `ir`, scene by scene in document order. */
export function checkKinetic(ir: IrVideo): Diagnostic[] {
  return ir.scenes.flatMap((scene): Diagnostic[] => {
    if (!("animation" in scene) || scene.animation?.name !== "kinetic") {
      return [];
    }
    const words = countWords(slotTexts(scene.content)["default"] ?? "");
    if (words <= KINETIC_MAX_WORDS) return [];
    const { file, line } = scene.source;
    return [
      {
        severity: "warning",
        code: "W_ANIMATION_FALLBACK",
        message: `Scene "${scene.id}" has ${words} words; "kinetic" shows at most ${KINETIC_MAX_WORDS} word by word, so it is drawn with "fade-in".`,
        file,
        ...(line === undefined ? {} : { line }),
        sceneId: scene.id,
        component: scene.component,
        property: "animation",
        suggestion: `Shorten the statement to at most ${KINETIC_MAX_WORDS} words, or choose "fade-in" or "reveal" for it.`,
      },
    ];
  });
}
