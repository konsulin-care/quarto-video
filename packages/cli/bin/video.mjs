#!/usr/bin/env node
// Launcher for the `video` bin. Loads the TypeScript sources through tsx
// (root devDependency) and runs src/cli.ts. Paths resolve from this file, so
// the command works from any working directory.
import { register } from "tsx/esm/api";

register();
await import("../src/cli.ts");
