// Stage 2 text-fit warnings (tasks 025, 026): a component whose contract sets
// `textFit` scales its default slot's text (and its subtitle's, if declared)
// within the theme's type scale. Text that does not fit even at the smallest
// size is a warning (W_TEXT_FIT), not an error: the renderer still draws it.
// Pure: the theme and the contracts are passed in. The rule is the renderer's
// (registry/layout fitStack), so both agree.
import type { IrVideo } from "@quarto-video/ir";
import { slotTexts } from "@quarto-video/ir/text";
import {
  listComponents,
  type ComponentContract,
  type ThemeTokens,
} from "@quarto-video/registry";
import {
  fitStack,
  mediaSideOf,
  safeBox,
  textMediaColumns,
  type Box,
} from "@quarto-video/registry/layout";
import type { Diagnostic } from "../diagnostic.js";

/** The slot a component's main text is in: `text` for text-media (task 042), else `default`. */
function primarySlot(scene: IrVideo["scenes"][number]): string {
  return scene.component === "text-media" ? "text" : "default";
}

/**
 * The box a scene's text is fitted in: the canvas safe box, or for text-media its
 * text column beside the footage (task 042), which the renderer draws it in.
 */
function fitBoxOf(
  scene: IrVideo["scenes"][number],
  theme: ThemeTokens,
  width: number,
  height: number,
): Box {
  if (scene.component !== "text-media") return safeBox(theme, width, height);
  const props = "props" in scene ? (scene.props ?? {}) : {};
  return textMediaColumns(theme, width, height, mediaSideOf(props["side"]))
    .text;
}

/** Every W_TEXT_FIT warning in `ir`, scene by scene in document order. */
export function checkTextFit(
  ir: IrVideo,
  theme: ThemeTokens,
  components: readonly ComponentContract[] = listComponents(),
): Diagnostic[] {
  const known = new Map(components.map((contract) => [contract.id, contract]));
  const { width, height } = ir.settings;
  return ir.scenes.flatMap((scene): Diagnostic[] => {
    const range = known.get(scene.component)?.textFit;
    if (range === undefined) return [];
    const texts = slotTexts(scene.content);
    const box = fitBoxOf(scene, theme, width, height);
    const fit = fitStack(
      {
        default: texts[primarySlot(scene)] ?? "",
        subtitle: texts["subtitle"] ?? "",
      },
      box,
      theme,
      range,
    );
    const { file, line } = scene.source;
    return Object.entries(fit).flatMap(([slot, result]): Diagnostic[] => {
      if (result === undefined || result.fits) return [];
      const label = slot === "default" ? "text" : `"${slot}" text`;
      return [
        {
          severity: "warning",
          code: "W_TEXT_FIT",
          message: `Scene "${scene.id}" ${label} needs about ${result.lines} lines at ${result.fontPx}px, the smallest size of "${scene.component}"; it does not fit ${scene.component === "text-media" ? "its text column" : `the ${width}x${height} frame`}.`,
          file,
          ...(line === undefined ? {} : { line }),
          sceneId: scene.id,
          component: scene.component,
          property: `slots.${slot === "default" ? primarySlot(scene) : slot}`,
          suggestion:
            "Shorten the text, or use a larger frame (for example 1920x1080).",
        },
      ];
    });
  });
}
