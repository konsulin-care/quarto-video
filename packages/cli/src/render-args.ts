// Arguments of `video render`: one `<path>`, `--json`, and `--theme <name>` (or
// `--theme=<name>`). Returns null for anything else, so the caller prints usage.
export interface RenderArgs {
  path: string;
  json: boolean;
  theme: string | null;
}

export function parseRenderArgs(args: string[]): RenderArgs | null {
  const paths: string[] = [];
  let json = false;
  let theme: string | null = null;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? "";
    if (arg === "--json") {
      json = true;
    } else if (arg === "--theme") {
      const value = args[index + 1];
      if (value === undefined || value === "" || value.startsWith("-"))
        return null;
      theme = value;
      index += 1;
    } else if (arg.startsWith("--theme=")) {
      const value = arg.slice("--theme=".length);
      if (value === "") return null;
      theme = value;
    } else if (arg.startsWith("-")) {
      return null;
    } else {
      paths.push(arg);
    }
  }
  if (paths.length !== 1) return null;
  return { path: paths[0] ?? "", json, theme };
}
