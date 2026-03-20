import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRootCache = new Map<string, string>();

function moduleDir(importMetaUrl: string): string {
  return dirname(fileURLToPath(importMetaUrl));
}

export function findPackageRoot(importMetaUrl: string): string {
  const startDir = moduleDir(importMetaUrl);
  const cached = packageRootCache.get(startDir);
  if (cached) {
    return cached;
  }

  let current = startDir;
  while (true) {
    if (existsSync(join(current, "package.json"))) {
      packageRootCache.set(startDir, current);
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      throw new Error(`Could not locate package.json from ${startDir}`);
    }
    current = parent;
  }
}

export function resolvePackagePath(importMetaUrl: string, ...segments: string[]): string {
  return join(findPackageRoot(importMetaUrl), ...segments);
}

export function readPackageVersion(importMetaUrl: string): string {
  const pkg = JSON.parse(
    readFileSync(resolvePackagePath(importMetaUrl, "package.json"), "utf-8"),
  ) as { version?: string };
  return pkg.version ?? "unknown";
}
