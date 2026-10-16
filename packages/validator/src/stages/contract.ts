// Stage 2 contract checks (PRD §5.3, §5.5, §9.1): each scene's component,
// slots and duration against its registry contract. Pure: the contracts are
// passed in, so tests can use their own. A scene whose component is unknown
// has no contract, so only its component is reported.
import type { IrBlock, IrSceneV02, IrVideoV02 } from "@quarto-video/ir";
import type { ComponentContract } from "@quarto-video/registry";
import type { Diagnostic, DiagnosticCode } from "../diagnostic.js";

type Where = Pick<Diagnostic, "file" | "line" | "sceneId" | "component">;

/** Where a scene is: its file, opening line, id and component (PRD §9.2). */
export function where(scene: IrSceneV02): Where {
  const { file, line } = scene.source;
  return {
    file,
    ...(line === undefined ? {} : { line }),
    sceneId: scene.id,
    component: scene.component,
  };
}

/** One error about a scene. */
export function problem(
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

/**
 * The item limit of a slot that takes one list (E_SLOT_CONSTRAINT, task 027).
 * A slot with no list is left to E_SLOT_BLOCK_KIND or E_SLOT_REQUIRED.
 */
function listConstraint(
  scene: IrSceneV02,
  contract: ComponentContract,
  name: string,
  limit: { minItems: number; maxItems: number },
  slots: IrSceneV02["content"]["slots"],
): Diagnostic | undefined {
  const lists = blocksIn(slots, name).filter((block) => block.type === "list");
  const property = `slots.${name}`;
  if (lists.length === 0) return undefined;
  if (lists.length > 1) {
    return problem(
      scene,
      "E_SLOT_CONSTRAINT",
      `Slot "${name}" of component "${contract.id}" holds ${lists.length} lists; it takes exactly one.`,
      property,
      "Put all the points in one list.",
    );
  }
  const only = lists[0];
  const count = only?.type === "list" ? only.items.length : 0;
  if (count >= limit.minItems && count <= limit.maxItems) return undefined;
  const range = `${limit.minItems} to ${limit.maxItems} items`;
  const noun = count === 1 ? "item" : "items";
  return problem(
    scene,
    "E_SLOT_CONSTRAINT",
    `Slot "${name}" of component "${contract.id}" has ${count} ${noun}; the limit is ${range}.`,
    property,
    `Use ${range}; split a longer list across scenes.`,
  );
}

/** Whether a required slot has its content: its own blocks, or its alternative's (task 039). */
function filled(
  slots: IrSceneV02["content"]["slots"],
  contract: ComponentContract,
  name: string,
): boolean {
  const alternative = contract.slots[name]?.alternative;
  return (
    blocksIn(slots, name).length > 0 ||
    (alternative !== undefined && blocksIn(slots, alternative).length > 0)
  );
}

/** A slot and its alternative hold one text between them: both filled is E_SLOT_CONSTRAINT (task 039). */
function alternativeConflicts(
  scene: IrSceneV02,
  contract: ComponentContract,
): Diagnostic[] {
  const slots = scene.content.slots;
  return Object.keys(contract.slots)
    .sort()
    .flatMap((name) => {
      const alternative = contract.slots[name]?.alternative;
      if (alternative === undefined) return [];
      if (blocksIn(slots, name).length === 0) return [];
      if (blocksIn(slots, alternative).length === 0) return [];
      return [
        problem(
          scene,
          "E_SLOT_CONSTRAINT",
          `Slots "${name}" and "${alternative}" of component "${contract.id}" are alternatives; a scene fills one of them.`,
          `slots.${alternative}`,
          `Move the text into "${name}" or into "${alternative}", not both.`,
        ),
      ];
    });
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
    const limit = contract.slots[name]?.items;
    if (limit !== undefined) {
      const constraint = listConstraint(scene, contract, name, limit, slots);
      if (constraint !== undefined) found.push(constraint);
    }
  }
  for (const name of Object.keys(contract.slots).sort()) {
    const slot = contract.slots[name];
    if (slot?.required !== true || filled(slots, contract, name)) continue;
    const alternative = slot.alternative;
    const either =
      alternative === undefined ? "" : ` or in slot "${alternative}"`;
    found.push(
      problem(
        scene,
        "E_SLOT_REQUIRED",
        `Component "${contract.id}" needs content in slot "${name}"${either}.`,
        `slots.${name}`,
        `Slot "${name}" accepts ${slot.accepts.join(", ")}.`,
      ),
    );
  }
  found.push(...alternativeConflicts(scene, contract));
  for (const name of Object.keys(contract.slots).sort()) {
    const max = contract.slots[name]?.maxBlocks;
    const count = blocksIn(slots, name).length;
    if (max === undefined || count <= max) continue;
    found.push({
      ...problem(
        scene,
        "W_SLOT_TOO_MANY_BLOCKS",
        `Slot "${name}" of component "${contract.id}" holds ${count} blocks; the component shows ${max}.`,
        `slots.${name}`,
        `Keep at most ${max} block${max === 1 ? "" : "s"} in "${name}"; move the rest to a scene of their own.`,
      ),
      severity: "warning",
    });
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

/** Every contract error in `ir`, scene by scene in document order (0.2 and 0.3). */
export function checkContracts(
  ir: Pick<IrVideoV02, "settings" | "scenes">,
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
