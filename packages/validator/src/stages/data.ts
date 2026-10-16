// Stage 3 data checks (task 035, ADR-0014). Each `csv` prop names a file that
// resolves inside the project (ADR-0006) and parses as CSV (csv/parse.ts; no
// code runs). Each `column` prop names a column of its csv prop, and a
// `numeric` column holds numbers only. A CSV error names the CSV file and its
// line. When every check passes, the scene gets `tables`: the parsed table
// under each csv prop name. The only file access is reading the named CSVs.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { IrSceneV02, IrTable, IrVideoV02 } from "@quarto-video/ir";
import type { ComponentContract } from "@quarto-video/registry";
import { resolveAsset } from "../assets/resolve.js";
import { parseCsv, type CsvError } from "../csv/parse.js";
import type { Diagnostic } from "../diagnostic.js";
import { problem, where } from "./contract.js";
import { textPropsOf } from "./props.js";

/** IR 1.4 scene field written here (ADR-0014). */
type WithTables = { tables?: Record<string, IrTable> };

export interface DataResult<T> {
  /** The manifest with `tables` on the scenes whose CSV props parsed. */
  ir: T;
  diagnostics: Diagnostic[];
}

/** One error about a row or line of a CSV file (its own file and line). */
function csvProblem(
  scene: IrSceneV02,
  file: string,
  line: number,
  message: string,
  code: "E_CSV_SYNTAX" | "E_CSV_VALUE",
  suggestion: string,
): Diagnostic {
  return {
    severity: "error",
    code,
    message,
    ...where(scene),
    file,
    line,
    property: "props.data",
    suggestion,
  };
}

function syntaxProblem(
  scene: IrSceneV02,
  file: string,
  error: CsvError,
): Diagnostic {
  return csvProblem(
    scene,
    file,
    error.line,
    `CSV line ${error.line}: ${error.message}`,
    "E_CSV_SYNTAX",
    error.suggestion,
  );
}

/** A CSV prop's file: the resolved table, or the diagnostics that stop it. */
function loadTable(
  scene: IrSceneV02,
  name: string,
  file: string,
  root: string,
): { table?: IrTable; rowLines?: number[]; diagnostics: Diagnostic[] } {
  const resolved = resolveAsset(root, file);
  if (!resolved.ok) {
    return {
      diagnostics: [
        {
          severity: "error",
          code: resolved.code,
          message: `${resolved.message}\nReferenced by scene "${scene.id}".`,
          ...where(scene),
          property: `props.${name}`,
          assetPath: file,
          suggestion: resolved.suggestion,
        },
      ],
    };
  }
  const parsed = parseCsv(readFileSync(join(root, resolved.path), "utf8"));
  if (!parsed.ok) {
    return { diagnostics: [syntaxProblem(scene, file, parsed.error)] };
  }
  return {
    table: { columns: parsed.table.columns, rows: parsed.table.rows },
    rowLines: parsed.table.rowLines,
    diagnostics: [],
  };
}

/** The first cell of `column` that is not a number, as a CSV error, or null. */
function nonNumeric(
  scene: IrSceneV02,
  file: string,
  table: IrTable,
  rowLines: number[],
  column: string,
): Diagnostic | null {
  const index = table.columns.indexOf(column);
  for (const [row, cells] of table.rows.entries()) {
    const cell = cells[index] ?? "";
    if (cell.trim() !== "" && Number.isFinite(Number(cell))) continue;
    return csvProblem(
      scene,
      file,
      rowLines[row] ?? 1,
      `Value "${cell}" in column "${column}" is not a number.`,
      "E_CSV_VALUE",
      `Use plain numbers in column "${column}", for example 12.5.`,
    );
  }
  return null;
}

/** The checks of one scene; `tables` collects each parsed CSV by prop name. */
function checkScene(
  scene: IrSceneV02,
  contract: ComponentContract,
  root: string,
  tables: Record<string, IrTable>,
): Diagnostic[] {
  const given = textPropsOf(scene);
  const found: Diagnostic[] = [];
  const lines: Record<string, number[]> = {};
  const csvNames = Object.keys(contract.props).filter(
    (name) => contract.props[name]?.type === "csv" && given[name] !== undefined,
  );
  for (const name of csvNames) {
    const file = given[name] ?? "";
    const loaded = loadTable(scene, name, file, root);
    found.push(...loaded.diagnostics);
    if (loaded.table !== undefined) {
      tables[name] = loaded.table;
      lines[name] = loaded.rowLines ?? [];
    }
  }
  for (const name of Object.keys(contract.props)) {
    const prop = contract.props[name];
    const column = given[name];
    if (prop?.type !== "column" || column === undefined) continue;
    const csvName = prop.of ?? "";
    const table = tables[csvName];
    if (table === undefined) continue;
    const file = given[csvName] ?? "";
    if (!table.columns.includes(column)) {
      found.push(
        problem(
          scene,
          "E_COLUMN_UNKNOWN",
          `Column "${column}" is not a column of ${file}. Available columns: ${table.columns.join(", ")}.`,
          `props.${name}`,
          `Set ${name}="<column>" to one of: ${table.columns.join(", ")}.`,
        ),
      );
      continue;
    }
    if (prop.numeric === true) {
      const bad = nonNumeric(scene, file, table, lines[csvName] ?? [], column);
      if (bad !== null) found.push(bad);
    }
  }
  return found;
}

/**
 * Stage 3 for `ir`: reads and checks every CSV prop and column prop, and
 * returns the manifest with `tables` on the scenes that pass. Scenes whose
 * component is unknown are skipped (stage 2 reports them).
 */
export function resolveData<T extends Pick<IrVideoV02, "scenes">>(
  ir: T,
  components: readonly ComponentContract[],
  root: string,
): DataResult<T> {
  const known = new Map(components.map((contract) => [contract.id, contract]));
  const diagnostics: Diagnostic[] = [];
  const scenes = ir.scenes.map((scene): IrSceneV02 & WithTables => {
    const contract = known.get(scene.component);
    if (contract === undefined) return scene;
    const tables: Record<string, IrTable> = {};
    diagnostics.push(...checkScene(scene, contract, root, tables));
    return Object.keys(tables).length > 0 ? { ...scene, tables } : scene;
  });
  return { ir: { ...ir, scenes } as T, diagnostics };
}
