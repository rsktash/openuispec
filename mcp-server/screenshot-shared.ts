/**
 * Shared utilities for platform screenshot tools (web, android, ios).
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import YAML from "yaml";
import { findProjectDir } from "../drift/index.js";

// ── shared browser manager ──────────────────────────────────────────

let browserInstance: any = null;
let launchPromise: Promise<any> | null = null;

export async function getBrowser(): Promise<any> {
  if (browserInstance?.connected) return browserInstance;

  if (!launchPromise) {
    launchPromise = (async () => {
      let puppeteer: any;
      try {
        puppeteer = await import("puppeteer");
      } catch {
        throw new Error(
          "puppeteer is not installed. Run:\n  npm install -g puppeteer\n" +
          "or add it to your project's devDependencies.",
        );
      }

      browserInstance = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      return browserInstance;
    })();
  }
  return launchPromise;
}

export async function closeBrowser(): Promise<void> {
  launchPromise = null;
  if (browserInstance) {
    try { await browserInstance.close(); } catch { /* ignore */ }
    browserInstance = null;
  }
}

// ── shared result type ──────────────────────────────────────────────

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export type ScreenshotResult = CallToolResult;

// ── manifest loading ────────────────────────────────────────────────

export interface ManifestInfo {
  projectDir: string;
  projectRoot: string;
  manifest: any;
  projectName: string;
}

export function loadManifest(projectCwd: string): ManifestInfo {
  const projectDir = findProjectDir(projectCwd);
  const manifestPath = join(projectDir, "openuispec.yaml");
  const manifest = YAML.parse(readFileSync(manifestPath, "utf-8"));
  const projectName = manifest.project?.name ?? "app";
  const projectRoot = resolve(projectDir, "..");
  return { projectDir, projectRoot, manifest, projectName };
}

// ── generic platform app directory discovery ────────────────────────

function tryFindProjectDir(cwd: string): string | null {
  if (existsSync(join(cwd, "openuispec.yaml"))) {
    return cwd;
  }
  try { return findProjectDir(cwd); } catch { return null; }
}

export function findPlatformAppDir(
  projectCwd: string,
  platform: "web" | "android" | "ios",
  existsCheck: (dir: string) => boolean,
  directDir?: string,
): string {
  const label = platform.charAt(0).toUpperCase() + platform.slice(1);

  // If a direct project dir is provided, use it without manifest lookup
  if (directDir) {
    const resolved = resolve(directDir);
    if (existsCheck(resolved)) return resolved;
    throw new Error(`${label} project not found at provided path: ${resolved}`);
  }

  // Check if projectCwd has an openuispec.yaml — if so, use manifest-based discovery
  const manifestDir = tryFindProjectDir(projectCwd);

  if (manifestDir) {
    const manifestPath = join(manifestDir, "openuispec.yaml");
    const manifest = YAML.parse(readFileSync(manifestPath, "utf-8"));
    const projectName = manifest.project?.name ?? "app";
    const projectRoot = resolve(manifestDir, "..");

    // Check custom output_dir first
    const customDir = manifest.generation?.output_dir?.[platform];
    if (customDir) {
      const resolved = resolve(manifestDir, customDir);
      if (existsCheck(resolved)) return resolved;
    }

    // Default: generated/<platform>/<project-name>/
    const defaultDir = join(projectRoot, "generated", platform, projectName);
    if (existsCheck(defaultDir)) return defaultDir;

    throw new Error(
      `${label} app not found. Checked:\n` +
      (customDir ? `  - ${resolve(manifestDir, customDir)}\n` : "") +
      `  - ${defaultDir}\n` +
      `Generate the ${platform} target first, then try again.`,
    );
  }

  // No manifest — treat projectCwd itself as the platform project dir
  const resolved = resolve(projectCwd);
  if (existsCheck(resolved)) return resolved;

  throw new Error(
    `${label} project not found at ${resolved}. ` +
    `Provide a project_dir parameter or create an openuispec.yaml manifest.`,
  );
}

// ── file hashing / caching ──────────────────────────────────────────

export function hashContent(content: string): string {
  return createHash("md5").update(content).digest("hex");
}

export function loadHashes(dir: string, hashFile: string): Record<string, string> {
  const hashPath = join(dir, hashFile);
  try {
    return JSON.parse(readFileSync(hashPath, "utf-8"));
  } catch {
    return {};
  }
}

export function saveHashes(dir: string, hashFile: string, hashes: Record<string, string>): void {
  writeFileSync(join(dir, hashFile), JSON.stringify(hashes, null, 2));
}

// ── screen name filter ──────────────────────────────────────────────

export function matchesScreenFilter(screenName: string, filter: string): boolean {
  const normalizedFilter = filter.toLowerCase().replace(/_/g, "");
  const normalizedScreen = screenName.toLowerCase().replace(/_/g, "");
  return normalizedScreen.includes(normalizedFilter) || normalizedFilter.includes(normalizedScreen);
}

// ── recursive file walker ───────────────────────────────────────────

export function walkFiles(
  dir: string,
  ext: string,
  skipDirs: string[] = [],
): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  const walk = (d: string) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const fullPath = join(d, entry.name);
      if (entry.isDirectory()) {
        if (!skipDirs.includes(entry.name)) walk(fullPath);
      } else if (entry.name.endsWith(ext)) {
        results.push(fullPath);
      }
    }
  };

  walk(dir);
  return results;
}

// ── PNG snapshot collector ──────────────────────────────────────────

export function collectPngSnapshots(
  dirs: string[],
  rootDir: string,
  screenFilter: string | undefined,
  nameExtractor: (filename: string) => string,
): Array<{ screen: string; path: string; data: string }> {
  const snapshots: Array<{ screen: string; path: string; data: string }> = [];
  const seen = new Set<string>();

  for (const dir of dirs) {
    const pngs = walkFiles(dir, ".png");
    for (const fullPath of pngs) {
      const filename = fullPath.split("/").pop()!;
      const screen = nameExtractor(filename);

      if (screenFilter && !matchesScreenFilter(screen, screenFilter)) continue;

      const key = relative(rootDir, fullPath);
      if (seen.has(key)) continue;
      seen.add(key);

      const data = readFileSync(fullPath).toString("base64");
      snapshots.push({ screen, path: key, data });
    }
  }

  return snapshots;
}

// ── screenshot response builder ─────────────────────────────────────

export function buildScreenshotResponse(
  snapshots: Array<{ screen: string; path: string; data: string }>,
  metadataFn: (snapshot: { screen: string; path: string }) => Record<string, unknown>,
): ScreenshotResult {
  if (snapshots.length === 0) {
    return {
      content: [{ type: "text", text: "No screenshots generated. Check build output." }],
      isError: true,
    };
  }

  const content: ScreenshotResult["content"] = [];
  for (const snapshot of snapshots) {
    content.push({ type: "image" as const, data: snapshot.data, mimeType: "image/png" });
    content.push({ type: "text" as const, text: JSON.stringify(metadataFn(snapshot), null, 2) });
  }
  return { content };
}
