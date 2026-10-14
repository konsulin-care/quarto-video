// Asset resolution against the file system (ADR-0006), after the syntax check.
// Every segment must exist with its exact spelling, and every directory and
// the file itself must really (realpath) lie inside the real project root.
// The walk checks each step before it lists the next directory, so nothing
// outside the root is listed, and file content is never read.
import { readdirSync, realpathSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import { checkAssetSyntax, type AssetProblem } from "./syntax.js";

export type AssetResolution = { ok: true; path: string } | AssetProblem;

function missing(raw: string): AssetProblem {
  return {
    ok: false,
    code: "E_ASSET_MISSING",
    message: `Asset "${raw}" was not found.`,
    suggestion:
      "Check the spelling and letter case of the path, or add the file to the project.",
    assetPath: raw,
  };
}

function escapesThroughSymlink(raw: string): AssetProblem {
  return {
    ok: false,
    code: "E_ASSET_SYMLINK",
    message: `Asset "${raw}" resolves outside the project root through a symlink.`,
    suggestion:
      "Copy the file into the project, or point the symlink at a file inside it.",
    assetPath: raw,
  };
}

/** Names in a directory, or null when it cannot be listed. */
function listing(dir: string): string[] | null {
  try {
    return readdirSync(dir);
  } catch {
    return null;
  }
}

/** True when the real path of `path` is inside `realRoot`; null when it cannot be resolved. */
function insideRoot(realRoot: string, path: string): boolean | null {
  try {
    const real = realpathSync(path);
    return real === realRoot || real.startsWith(realRoot + sep);
  } catch {
    return null;
  }
}

/**
 * Resolves one asset reference against the project root `root` (absolute).
 * Returns the normalised project-relative path, or the problem: a syntax
 * code (ADR-0006), E_ASSET_MISSING, or E_ASSET_SYMLINK.
 */
export function resolveAsset(root: string, raw: string): AssetResolution {
  const syntax = checkAssetSyntax(raw);
  if (!syntax.ok) return syntax;
  const realRoot = realpathSync(root);
  let current = root;
  for (const name of syntax.path.split("/")) {
    const names = listing(current);
    if (names === null || !names.includes(name)) return missing(raw);
    current = join(current, name);
    const inside = insideRoot(realRoot, current);
    if (inside === null) return missing(raw);
    if (!inside) return escapesThroughSymlink(raw);
  }
  if (!statSync(current).isFile()) return missing(raw);
  return { ok: true, path: syntax.path };
}
