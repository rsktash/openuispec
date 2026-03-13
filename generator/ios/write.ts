/**
 * Writes generated Swift files to the output directory.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";

export interface GeneratedFile {
  path: string;   // relative to output root, e.g. "Sources/Theme/Color+Tokens.swift"
  content: string;
}

export function writeFiles(outputDir: string, files: GeneratedFile[]): void {
  for (const file of files) {
    const fullPath = resolve(outputDir, file.path);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, file.content, "utf-8");
  }
}
