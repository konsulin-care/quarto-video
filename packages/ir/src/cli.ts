// `npm run ir:check -w packages/ir -- <file.json>`: prints OK or one line
// per error; exit 0 when valid, 1 otherwise (including unreadable input).
import { readFileSync } from "node:fs";
import { checkIrText } from "./check.js";

const file = process.argv[2];
if (file === undefined || process.argv.length > 3) {
  process.stderr.write("usage: ir:check <file.json>\n");
  process.exitCode = 1;
} else {
  let text: string | undefined;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    process.stderr.write(`${file}: cannot read file\n`);
    process.exitCode = 1;
  }
  if (text !== undefined) {
    const { ok, lines } = checkIrText(text);
    process.stdout.write(`${lines.join("\n")}\n`);
    process.exitCode = ok ? 0 : 1;
  }
}
