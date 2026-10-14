// Project resolution (packages/cli/README.md): a directory means its
// index.qmd; a .qmd file is the document and its parent is the project root.
// Pure apart from reading file metadata. Paths resolve from `cwd`, the
// caller's working directory, and the result is always absolute.
import { existsSync, statSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";

export interface Project {
  /** Absolute project root; generated files go to `<root>/.video-build/`. */
  root: string;
  /** Absolute path of the `.qmd` document to run through the filter. */
  document: string;
  /** Project directory basename, e.g. `minimal-filter`. */
  name: string;
}

/** A path the user gave that does not name a project (exit code 2). */
export class ProjectError extends Error {}

function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

function isDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

/** Resolves `input` (directory or `.qmd` file) to a project. Throws ProjectError. */
export function resolveProject(input: string, cwd: string): Project {
  const target = resolve(cwd, input);
  if (isDirectory(target)) {
    const document = join(target, "index.qmd");
    if (!isFile(document)) {
      throw new ProjectError(`${input}: no index.qmd in this directory`);
    }
    return { root: target, document, name: basename(target) };
  }
  if (!existsSync(target)) {
    throw new ProjectError(`${input}: no such file or directory`);
  }
  if (!isFile(target) || extname(target) !== ".qmd") {
    throw new ProjectError(`${input}: not a project directory or a .qmd file`);
  }
  const root = dirname(target);
  return { root, document: target, name: basename(root) };
}
