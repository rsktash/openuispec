/**
 * preview.ts — Orchestrates spec loading, mock data, and HTML rendering
 * for the openuispec_preview tool.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import YAML from "yaml";
import { findProjectDir } from "../drift/index.js";
import { getBrowser, type ScreenshotResult } from "./screenshot-shared.js";
import { renderPage, type PreviewContext } from "./preview-render.js";

// ── types ───────────────────────────────────────────────────────────

export interface PreviewOptions {
  screen: string;
  size_class?: "compact" | "regular" | "expanded";
  theme?: "light" | "dark";
  locale?: string;
  viewport?: { width: number; height: number };
  include_html?: boolean;
}

// ── viewport defaults per size class ────────────────────────────────

const SIZE_CLASS_VIEWPORTS: Record<string, { width: number; height: number }> = {
  compact: { width: 390, height: 844 },
  regular: { width: 820, height: 1180 },
  expanded: { width: 1280, height: 800 },
};

// ── spec loading helpers ────────────────────────────────────────────

function loadManifest(projectDir: string): any {
  const manifestPath = join(projectDir, "openuispec.yaml");
  if (!existsSync(manifestPath)) {
    throw new Error(`Manifest not found at ${manifestPath}`);
  }
  return YAML.parse(readFileSync(manifestPath, "utf-8"));
}

function loadScreen(projectDir: string, manifest: any, screenName: string): any {
  const screensDir = resolve(projectDir, manifest.includes?.screens ?? "./screens/");

  // Try exact filename first
  const candidates = [
    join(screensDir, `${screenName}.yaml`),
    join(screensDir, `${screenName}.yml`),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return YAML.parse(readFileSync(candidate, "utf-8"));
    }
  }

  // Scan all screen files for matching screen name key
  if (existsSync(screensDir)) {
    for (const file of readdirSync(screensDir)) {
      if (!file.endsWith(".yaml") && !file.endsWith(".yml")) continue;
      const content = YAML.parse(readFileSync(join(screensDir, file), "utf-8"));
      if (content && typeof content === "object" && screenName in content) {
        return content;
      }
    }
  }

  throw new Error(
    `Screen "${screenName}" not found in ${screensDir}. ` +
    `Available: ${existsSync(screensDir) ? readdirSync(screensDir).filter(f => f.endsWith(".yaml")).map(f => f.replace(".yaml", "")).join(", ") : "none"}`,
  );
}

function loadAllTokens(projectDir: string, manifest: any): Record<string, any> {
  const tokensDir = resolve(projectDir, manifest.includes?.tokens ?? "./tokens/");
  const tokens: Record<string, any> = {};

  if (!existsSync(tokensDir)) return tokens;

  for (const file of readdirSync(tokensDir)) {
    if (!file.endsWith(".yaml") && !file.endsWith(".yml")) continue;
    const category = file.replace(/\.ya?ml$/, "");
    try {
      tokens[category] = YAML.parse(readFileSync(join(tokensDir, file), "utf-8"));
    } catch {
      // Skip malformed token files
    }
  }

  return tokens;
}

function loadLocale(projectDir: string, manifest: any, localeName: string): Record<string, string> {
  const localesDir = resolve(projectDir, manifest.includes?.locales ?? "./locales/");

  const candidates = [
    join(localesDir, `${localeName}.json`),
    join(localesDir, `${localeName}.yaml`),
    join(localesDir, `${localeName}.yml`),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      const content = readFileSync(candidate, "utf-8");
      if (candidate.endsWith(".json")) {
        return JSON.parse(content);
      }
      return YAML.parse(content) ?? {};
    }
  }

  // Fallback to default locale
  const defaultLocale = manifest.i18n?.default_locale ?? "en";
  if (localeName !== defaultLocale) {
    return loadLocale(projectDir, manifest, defaultLocale);
  }

  return {};
}

function loadContractDefs(projectDir: string, manifest: any): Record<string, any> {
  const contractsDir = resolve(projectDir, manifest.includes?.contracts ?? "./contracts/");
  const defs: Record<string, any> = {};

  if (!existsSync(contractsDir)) return defs;

  for (const file of readdirSync(contractsDir)) {
    if (!file.endsWith(".yaml") && !file.endsWith(".yml")) continue;
    try {
      const content = YAML.parse(readFileSync(join(contractsDir, file), "utf-8"));
      if (content && typeof content === "object") {
        const name = file.replace(/\.ya?ml$/, "");
        defs[name] = content;
      }
    } catch {
      // Skip malformed contract files
    }
  }

  return defs;
}

function loadMockData(projectDir: string, screenName: string): { data: Record<string, any>; params: Record<string, any> } {
  const mockDir = join(projectDir, "mock");

  const candidates = [
    join(mockDir, `${screenName}.yaml`),
    join(mockDir, `${screenName}.yml`),
    join(mockDir, `${screenName}.json`),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      const content = readFileSync(candidate, "utf-8");
      let parsed: any;
      if (candidate.endsWith(".json")) {
        parsed = JSON.parse(content);
      } else {
        parsed = YAML.parse(content);
      }
      return {
        data: parsed?.data ?? parsed ?? {},
        params: parsed?.params ?? {},
      };
    }
  }

  return { data: {}, params: {} };
}

// ── main preview function ───────────────────────────────────────────

export async function renderPreview(
  projectCwd: string,
  options: PreviewOptions,
): Promise<ScreenshotResult> {
  const {
    screen,
    size_class = "compact",
    theme = "light",
    locale: localeName = "en",
    viewport,
    include_html = false,
  } = options;

  // 1. Find project directory
  const projectDir = findProjectDir(projectCwd);

  // 2. Load specs
  const manifest = loadManifest(projectDir);
  const screenSpec = loadScreen(projectDir, manifest, screen);
  const tokens = loadAllTokens(projectDir, manifest);
  const locale = loadLocale(projectDir, manifest, localeName);

  // 3. Load contract definitions (project extensions)
  const contractDefs = loadContractDefs(projectDir, manifest);
  manifest._contractDefs = contractDefs;

  // 4. Load mock data
  const { data: mockData, params: mockParams } = loadMockData(projectDir, screen);

  // 5. Build render context
  const ctx: PreviewContext = {
    manifest,
    screen: screenSpec,
    screenName: screen,
    tokens,
    locale,
    mockData,
    mockParams,
    sizeClass: size_class,
    theme,
  };

  // 6. Render HTML
  const html = renderPage(ctx);

  // 7. Screenshot with Puppeteer
  const vp = viewport ?? SIZE_CLASS_VIEWPORTS[size_class];
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 2,
    });

    if (theme === "dark") {
      await page.emulateMediaFeatures([
        { name: "prefers-color-scheme", value: "dark" },
      ]);
    }

    await page.setContent(html, { waitUntil: "load", timeout: 10_000 });

    // Small delay for CSS to settle
    await new Promise((r) => setTimeout(r, 200));

    const buffer = await page.screenshot({ type: "png", fullPage: true });
    const base64 = buffer.toString("base64");

    const content: ScreenshotResult["content"] = [
      { type: "image" as const, data: base64, mimeType: "image/png" },
      {
        type: "text" as const,
        text: JSON.stringify({
          screen,
          size_class,
          theme,
          locale: localeName,
          viewport: vp,
          mock_data_loaded: Object.keys(mockData).length > 0,
        }, null, 2),
      },
    ];

    if (include_html) {
      content.push({ type: "text" as const, text: html });
    }

    return { content };
  } finally {
    await page.close();
  }
}
