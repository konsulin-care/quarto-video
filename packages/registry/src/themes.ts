// Loads and checks theme token files (PRD §10, §12). A theme that fails the
// schema, or whose declared text pairs are below WCAG AA (4.5:1), is a
// RegistryError naming the file and path. Pure apart from reading the files.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import { contrastRatio } from "./contrast.js";
import { RegistryError } from "./load.js";
import type { ThemeTokens } from "./types.js";

/** The theme used when front matter names none (PRD §5.2). */
export const DEFAULT_THEME = "modern";

/** WCAG AA contrast for normal text. */
const MIN_TEXT_CONTRAST = 4.5;

const SCHEMA_URL = new URL("../schema/theme.json", import.meta.url);
const THEMES_DIR = fileURLToPath(new URL("../themes", import.meta.url));
const schema: unknown = JSON.parse(readFileSync(SCHEMA_URL, "utf8"));

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateTheme = ajv.compile(schema as object);

/** Parses one theme file's text. `file` names it in every error. */
export function parseTheme(text: string, file: string): ThemeTokens {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new RegistryError(`${file}: not valid JSON: ${reason}`);
  }
  if (!validateTheme(value)) {
    const problems = (validateTheme.errors ?? []).map((error) => {
      const where = error.instancePath === "" ? "(root)" : error.instancePath;
      const extra =
        error.keyword === "additionalProperties"
          ? ` "${String(error.params["additionalProperty"])}"`
          : "";
      return `${where}: ${error.message ?? "is invalid"}${extra}`;
    });
    throw new RegistryError(`${file}: ${problems.join("; ")}`);
  }
  const theme = value as ThemeTokens;
  const expectedFile = `${theme.id}.json`;
  if (!file.endsWith(`/${expectedFile}`) && file !== expectedFile) {
    throw new RegistryError(
      `${file}: id "${theme.id}" must match the file name (${expectedFile})`,
    );
  }
  theme.contrastPairs.forEach((pair, index) => {
    const ratio = contrastRatio(
      theme.colors[pair.text],
      theme.colors[pair.background],
    );
    if (ratio < MIN_TEXT_CONTRAST) {
      throw new RegistryError(
        `${file}: /contrastPairs/${index}: ${pair.text} on ${pair.background} is ${ratio.toFixed(2)}:1, below ${MIN_TEXT_CONTRAST}:1`,
      );
    }
  });
  return theme;
}

/** Loads every theme in `dir`, sorted by id. Any other entry is an error. */
export function loadThemeDir(dir: string): ThemeTokens[] {
  const themes: ThemeTokens[] = [];
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (!name.endsWith(".json") || !statSync(path).isFile()) {
      throw new RegistryError(
        `${name}: only <id>.json theme files belong here`,
      );
    }
    themes.push(parseTheme(readFileSync(path, "utf8"), name));
  }
  return themes.sort((a, b) => a.id.localeCompare(b.id));
}

let loaded: ThemeTokens[] | undefined;

function all(): ThemeTokens[] {
  loaded ??= loadThemeDir(THEMES_DIR);
  return loaded;
}

/** Every theme, sorted by id. Copies: callers cannot change the registry. */
export function listThemes(): ThemeTokens[] {
  return structuredClone(all());
}

/** The tokens for `id`. An unknown id is a RegistryError listing the known ids. */
export function getTheme(id: string): ThemeTokens {
  const found = all().find((theme) => theme.id === id);
  if (found === undefined) {
    const known = all()
      .map((theme) => theme.id)
      .join(", ");
    throw new RegistryError(`unknown theme "${id}" (known: ${known})`);
  }
  return structuredClone(found);
}
