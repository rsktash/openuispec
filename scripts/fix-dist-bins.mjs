import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const NODE_SHEBANG = "#!/usr/bin/env node";
const entrypoints = [
  resolve("dist/cli/index.js"),
  resolve("dist/mcp-server/index.js"),
  resolve("dist/check/index.js"),
  resolve("dist/prepare/index.js"),
  resolve("dist/status/index.js"),
  resolve("dist/drift/index.js"),
  resolve("dist/schema/validate.js"),
];

for (const filePath of entrypoints) {
  const content = readFileSync(filePath, "utf8");
  const updated = content.startsWith("#!")
    ? content.replace(/^#![^\n]*\n/, `${NODE_SHEBANG}\n`)
    : `${NODE_SHEBANG}\n${content}`;
  writeFileSync(filePath, updated);
  chmodSync(filePath, 0o755);
}
