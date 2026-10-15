// Stage 2 text-fit warnings (task 025): a component whose contract sets
// `textFit` scales its default slot's text within the theme's type scale. Text
// that does not fit even at the smallest size is a warning (W_TEXT_FIT), not an
// error: the renderer still draws it. Pure: the theme and the contracts are
// passed in. The rule is the renderer's (registry/layout fitText), so both agree.
import type { IrVideo } from "@quarto-video/ir";
import { slotTexts } from "@quarto-video/ir/text";
import {
  listComponents,
  type ComponentContract,
  type ThemeTokens,
} from "@quarto-video/registry";
import { fitText, safeBox } from "@quarto-video/registry/layout";
import type { Diagnostic } from "../diagnostic.js";

/** Every W_TEXT_FIT warning in `ir`, scene by scene in document order. */
export function checkTextFit(
  ir: IrVideo,
  theme: ThemeTokens,
  components: readonly ComponentContract[] = listComponents(),
): Diagnostic[] {
  const known = new Map(components.map((contract) => [contract.id, contract]));
  const { width, height } = ir.settings;
  const box = safeBox(theme, width, height);
  return ir.scenes.flatMap((scene): Diagnostic[] => {
    const range = known.get(scene.component)?.textFit;
    if (range === undefined) return [];
    const text = slotTexts(scene.content)["default"] ?? "";
    const result = fitText(text, box, theme, range);
    if (result.fits) return [];
    const { file, line } = scene.source;
    return [
      {
        severity: "warning",
        code: "W_TEXT_FIT",
        message: `Scene "${scene.id}" text needs about ${result.lines} lines at ${result.fontPx}px, the smallest size of "${scene.component}"; it does not fit the ${width}x${height} frame.`,
        file,
        ...(line === undefined ? {} : { line }),
        sceneId: scene.id,
        component: scene.component,
        property: "slots.default",
        suggestion:
          "Shorten the text, or use a larger frame (for example 1920x1080).",
      },
    ];
  });
}
