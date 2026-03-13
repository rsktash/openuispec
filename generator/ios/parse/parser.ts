/**
 * Reads the OpenUISpec manifest and all referenced files into a SpecProject.
 */

import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import YAML from "yaml";
import type {
  SpecManifest,
  SpecProject,
  ColorTokens,
  TypographyTokens,
  SpacingTokens,
  ElevationTokens,
  MotionTokens,
  ThemeTokens,
  IconTokens,
  LayoutTokens,
  ScreenDef,
  FlowDef,
  PlatformConfig,
  LocaleStrings,
} from "./types.js";

function loadYaml<T>(filePath: string): T {
  return YAML.parse(readFileSync(filePath, "utf-8")) as T;
}

function loadJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf-8")) as T;
}

function listFiles(dir: string, ext: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(ext))
      .sort()
      .map((f) => join(dir, f));
  } catch {
    return [];
  }
}

export function parseProject(projectDir: string): SpecProject {
  const manifestPath = resolve(projectDir, "openuispec.yaml");
  const manifest = loadYaml<SpecManifest>(manifestPath);

  const tokensDir = resolve(projectDir, manifest.includes.tokens);
  const screensDir = resolve(projectDir, manifest.includes.screens);
  const flowsDir = resolve(projectDir, manifest.includes.flows);
  const platformDir = resolve(projectDir, manifest.includes.platform);
  const localesDir = resolve(projectDir, manifest.includes.locales);

  // Load tokens
  const color = loadYaml<ColorTokens>(join(tokensDir, "color.yaml"));
  const typography = loadYaml<TypographyTokens>(join(tokensDir, "typography.yaml"));
  const spacing = loadYaml<SpacingTokens>(join(tokensDir, "spacing.yaml"));
  const elevation = loadYaml<ElevationTokens>(join(tokensDir, "elevation.yaml"));
  const motion = loadYaml<MotionTokens>(join(tokensDir, "motion.yaml"));
  const themes = loadYaml<ThemeTokens>(join(tokensDir, "themes.yaml"));
  const icons = loadYaml<IconTokens>(join(tokensDir, "icons.yaml"));
  const layout = loadYaml<LayoutTokens>(join(tokensDir, "layout.yaml"));

  // Load screens
  const screens: Record<string, ScreenDef> = {};
  for (const f of listFiles(screensDir, ".yaml")) {
    const data = loadYaml<Record<string, ScreenDef>>(f);
    const key = Object.keys(data)[0];
    screens[key] = data[key];
  }

  // Load flows
  const flows: Record<string, FlowDef> = {};
  for (const f of listFiles(flowsDir, ".yaml")) {
    const data = loadYaml<Record<string, FlowDef>>(f);
    const key = Object.keys(data)[0];
    flows[key] = data[key];
  }

  // Load platform
  const platform = loadYaml<PlatformConfig>(join(platformDir, "ios.yaml"));

  // Load locales
  const locales: Record<string, LocaleStrings> = {};
  for (const f of listFiles(localesDir, ".json")) {
    const data = loadJson<LocaleStrings>(f);
    const locale = data.$locale ?? "en";
    locales[locale] = data;
  }

  return {
    manifest,
    tokens: { color, typography, spacing, elevation, motion, themes, icons, layout },
    screens,
    flows,
    platform,
    locales,
  };
}
