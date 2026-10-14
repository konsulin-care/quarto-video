// Stage 2 contract checks (PRD §5.3, §5.5, §9.1): each scene's component,
// slots and duration against its registry contract. Pure: the contracts are
// passed in, so tests can use their own. A scene whose component is unknown
// has no contract, so only its component is reported.
import type { IrBlock, IrSceneV02, IrVideoV02 } from "@quarto-video/ir";
import type { ComponentContract } from "@quarto-video/registry";
import type { Diagnostic, DiagnosticCode } from "../diagnostic.js";

type Where = Pick<Diagnostic, "file" | "line" | "sceneId" | "component">;

/** Where a scene is: its file, opening line, id and component (PRD §9.2). */
function where(scene: IrSceneV02): Where {
  const { file, line } = scene.source;
  return {
    file,
    ...(line === undefined ? {} : { line }),
    sceneId: scene.id,
    component: scene.component,
  };
}

/** One error about a scene. */
function problem(
  scene: IrSceneV02,
  code: DiagnosticCode,
  message: string,
  property: string,
  suggestion: string,
): Diagnostic {
  return {
    severity: "error",
    code,
    message,
    ...where(scene),
    property,
    suggestion,
  };
}

/** Seconds as an author writes them: "1s", "0.5s" (at most 3 decimals). */
export function seconds(ms: number): string {
  return `${Number((ms / 1000).toFixed(3))}s`;
}

/** The blocks of one slot, or none when the scene has no such slot. */
function blocksIn(
  slots: IrSceneV02["content"]["slots"],
  name: string,
): IrBlock[] {
  return Object.hasOwn(slots, name) ? (slots[name] ?? []) : [];
}

/** Block kinds of one slot, in order of first appearance. */
function kindsOf(blocks: IrBlock[]): IrBlock["type"][] {
  return [...new Set(blocks.map((block) => block.type))];
}

function checkSlots(
  scene: IrSceneV02,
  contract: ComponentContract,
): Diagnostic[] {
  const slots = scene.content.slots;
  const found: Diagnostic[] = [];
  const available = Object.keys(contract.slots).sort().join(", ");
  for (const name of Object.keys(slots).sort()) {
    if (!Object.hasOwn(contract.slots, name)) {
      found.push(
        problem(
          scene,
          "E_SLOT_UNKNOWN",
          `Unknown slot "${name}" for component "${contract.id}".`,
          `slots.${name}`,
          `Available slots: ${available}.`,
        ),
      );
      continue;
    }
    const accepts = contract.slots[name]?.accepts ?? [];
    for (const kind of kindsOf(blocksIn(slots, name))) {
      if (accepts.includes(kind)) continue;
      found.push(
        problem(
          scene,
          "E_SLOT_BLOCK_KIND",
          `Slot "${name}" of component "${contract.id}" does not accept "${kind}" blocks.`,
          `slots.${name}`,
          `Slot "${name}" accepts ${accepts.join(", ")}.`,
        ),
      );
    }
  }
  for (const name of Object.keys(contract.slots).sort()) {
    const slot = contract.slots[name];
    if (slot?.required !== true || blocksIn(slots, name).length > 0) continue;
    found.push(
      problem(
        scene,
        "E_SLOT_REQUIRED",
        `Component "${contract.id}" needs content in slot "${name}".`,
        `slots.${name}`,
        `Slot "${name}" accepts ${slot.accepts.join(", ")}.`,
      ),
    );
  }
  return found;
}

function checkDuration(
  scene: IrSceneV02,
  contract: ComponentContract,
  fps: number,
): Diagnostic[] {
  // Integer arithmetic: frames * 1000 compares with the bounds in ms * fps.
  const { minMs, maxMs } = contract.duration;
  const frames = scene.durationFrames;
  const tooShort = frames * 1000 < minMs * fps;
  const tooLong = frames * 1000 > maxMs * fps;
  if (!tooShort && !tooLong) return [];
  const bounds = `${seconds(minMs)} to ${seconds(maxMs)}`;
  return [
    problem(
      scene,
      "E_DURATION_BOUNDS",
      `Scene "${scene.id}" lasts ${seconds((frames * 1000) / fps)}; component "${contract.id}" accepts ${bounds}.`,
      "duration",
      `Use a duration from ${bounds}.`,
    ),
  ];
}

/** Every contract error in `ir`, scene by scene in document order. */
export function checkContracts(
  ir: IrVideoV02,
  components: readonly ComponentContract[],
): Diagnostic[] {
  const known = new Map(components.map((contract) => [contract.id, contract]));
  const available = [...known.keys()].sort().join(", ");
  return ir.scenes.flatMap((scene): Diagnostic[] => {
    const contract = known.get(scene.component);
    if (contract === undefined) {
      return [
        problem(
          scene,
          "E_COMPONENT_UNKNOWN",
          `Unknown component "${scene.component}".`,
          "component",
          `Available components: ${available}.`,
        ),
      ];
    }
    return [
      ...checkSlots(scene, contract),
      ...checkDuration(scene, contract, ir.settings.fps),
    ];
  });
}
