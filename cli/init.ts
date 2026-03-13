/**
 * openuispec init — interactive project scaffolding
 *
 * Creates folder structure, manifest, and AI assistant rules
 * (CLAUDE.md / AGENTS.md) so AI tools track spec changes properly.
 */

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  existsSync,
  appendFileSync,
} from "node:fs";
import { join, relative } from "node:path";

// ── prompts ──────────────────────────────────────────────────────────

async function ask(
  rl: ReturnType<typeof createInterface>,
  question: string,
  fallback?: string
): Promise<string> {
  const suffix = fallback ? ` (${fallback})` : "";
  const answer = (await rl.question(`${question}${suffix}: `)).trim();
  return answer || fallback || "";
}

async function askList(
  rl: ReturnType<typeof createInterface>,
  question: string,
  options: string[],
  defaults: string[]
): Promise<string[]> {
  console.log(`${question}`);
  for (const opt of options) {
    const mark = defaults.includes(opt) ? "[x]" : "[ ]";
    console.log(`  ${mark} ${opt}`);
  }
  const raw = (
    await rl.question(`Enter choices (comma-separated, enter for defaults): `)
  ).trim();
  if (!raw) return defaults;
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => options.includes(s));
}

// ── scaffold ─────────────────────────────────────────────────────────

function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function writeIfMissing(path: string, content: string): boolean {
  if (existsSync(path)) {
    console.log(`  skip ${relative(process.cwd(), path)} (exists)`);
    return false;
  }
  writeFileSync(path, content);
  console.log(`  create ${relative(process.cwd(), path)}`);
  return true;
}

// ── templates ────────────────────────────────────────────────────────

function manifestTemplate(
  name: string,
  targets: string[],
  specDir: string
): string {
  const targetList = targets.join(", ");
  const outputLines = targets
    .map((t) => {
      if (t === "ios")
        return `    ios: { language: swift, framework: swiftui, min_version: "17.0" }`;
      if (t === "android")
        return `    android: { language: kotlin, framework: compose, min_sdk: 26 }`;
      if (t === "web")
        return `    web: { language: typescript, framework: react, bundler: vite }`;
      return `    ${t}: {}`;
    })
    .join("\n");

  return `# ${name} — OpenUISpec v0.1
spec_version: "0.1"

project:
  name: "${name}"
  description: ""

includes:
  tokens: "./tokens/"
  contracts: "./contracts/"
  screens: "./screens/"
  flows: "./flows/"
  platform: "./platform/"
  locales: "./locales/"

i18n:
  default_locale: "en"
  supported_locales: [en]
  fallback_strategy: "default"

generation:
  targets: [${targetList}]
  output_format:
${outputLines}

data_model: {}

api:
  base_url: "/api/v1"
  auth: "bearer_token"
  endpoints: {}
`;
}

function starterColorTokens(): string {
  return `# Design tokens: Color palette
brand:
  primary:
    "50": "#EEF2FF"
    "100": "#E0E7FF"
    "500": "#6366F1"
    "600": "#4F46E5"
    "900": "#312E81"

surface:
  background: "#FFFFFF"
  card: "#F9FAFB"
  elevated: "#FFFFFF"

text:
  primary: "#111827"
  secondary: "#6B7280"
  disabled: "#D1D5DB"

semantic:
  success: "#10B981"
  warning: "#F59E0B"
  error: "#EF4444"
  info: "#3B82F6"
`;
}

function starterTypographyTokens(): string {
  return `# Design tokens: Typography
font_families:
  sans: { default: "System" }

type_scale:
  title_lg:   { size: 28, weight: bold, tracking: 0, line_height: 1.2 }
  title_md:   { size: 22, weight: semibold, tracking: 0, line_height: 1.3 }
  title_sm:   { size: 17, weight: semibold, tracking: 0, line_height: 1.3 }
  body_lg:    { size: 17, weight: regular, tracking: 0, line_height: 1.5 }
  body_md:    { size: 15, weight: regular, tracking: 0, line_height: 1.5 }
  body_sm:    { size: 13, weight: regular, tracking: 0, line_height: 1.4 }
  label_lg:   { size: 15, weight: medium, tracking: 0.02, line_height: 1.3 }
  label_md:   { size: 13, weight: medium, tracking: 0.02, line_height: 1.3 }
  caption:    { size: 11, weight: regular, tracking: 0.02, line_height: 1.3 }
`;
}

function starterSpacingTokens(): string {
  return `# Design tokens: Spacing
base_unit: 4
platform_flex: "10%"

scale:
  "0":   0
  "1":   4
  "2":   8
  "3":   12
  "4":   16
  "5":   20
  "6":   24
  "8":   32
  "10":  40
  "12":  48
  "16":  64
`;
}

function starterLocale(): string {
  return JSON.stringify(
    {
      app: {
        name: "My App",
      },
    },
    null,
    2
  );
}

function aiRulesBlock(specDir: string, targets: string[]): string {
  const targetList = targets.map((t) => `"${t}"`).join(", ");
  return `
# OpenUISpec — AI Assistant Rules
# ================================
# This project uses OpenUISpec to define UI as a semantic spec.
# Spec files are the single source of truth for all UI across platforms.

## Spec location
- Spec root: \`${specDir}/\`
- Manifest: \`${specDir}/openuispec.yaml\`
- Always read \`openuispec.yaml\` first to understand the project structure.

## Before making UI changes
1. Read the relevant spec files (screens, tokens, flows) before modifying any UI code.
2. If the change requires a spec update, modify the spec files FIRST, then update generated code.
3. Never modify generated code directly — change the spec and regenerate.

## After modifying spec files
1. Run \`openuispec drift --snapshot --target <target>\` for each affected platform.
2. Targets in this project: ${targetList}.
3. Run \`openuispec drift\` to verify no untracked drift remains.

## Spec file conventions
- Tokens (colors, typography, spacing, motion, icons) live in \`${specDir}/tokens/\`.
- Contracts (UI component definitions) live in \`${specDir}/contracts/\`.
- Screens live in \`${specDir}/screens/\`. One screen per file.
- Navigation flows live in \`${specDir}/flows/\`.
- Platform overrides live in \`${specDir}/platform/\`.
- Localization strings live in \`${specDir}/locales/\`.

## Key rules
- The spec uses 7 contract families: nav_container, surface, action_trigger, input_field, data_display, collection, feedback.
- Custom contracts are prefixed with \`x_\` (e.g., \`x_media_player\`).
- Data binding uses \`$data:\`, \`$state:\`, \`$param:\`, \`$t:\` prefixes.
- Actions use typed action objects (navigate, api_call, set_state, confirm, etc.).
- When adding a new screen, also create the corresponding spec file.
- When renaming or removing a screen, update the spec and all flow references.
`;
}

// ── main ─────────────────────────────────────────────────────────────

export async function init(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });

  console.log("\nOpenUISpec — Project Setup\n");

  try {
    // 1. Project name
    const cwd = process.cwd();
    const defaultName =
      cwd.split("/").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "MyApp";
    const name = await ask(rl, "Project name", defaultName);

    // 2. Spec directory
    const specDir = await ask(rl, "Spec directory", "openuispec");

    // 3. Platforms
    const allTargets = ["ios", "android", "web"];
    const targets = await askList(
      rl,
      "\nWhich platforms?",
      allTargets,
      ["ios", "android"]
    );

    if (targets.length === 0) {
      console.error("At least one target is required.");
      process.exit(1);
    }

    // 4. Starter tokens?
    const wantTokens = await ask(rl, "Include starter tokens? (y/n)", "y");

    // 5. AI rules?
    const wantRules = await ask(
      rl,
      "Add rules to CLAUDE.md and AGENTS.md? (y/n)",
      "y"
    );

    rl.close();

    // ── create folders ─────────────────────────────────────────────

    console.log("\nScaffolding...\n");

    const root = join(cwd, specDir);
    const dirs = [
      "tokens",
      "contracts",
      "screens",
      "flows",
      "platform",
      "locales",
    ];

    ensureDir(root);
    for (const d of dirs) {
      ensureDir(join(root, d));
    }

    // ── manifest ───────────────────────────────────────────────────

    writeIfMissing(
      join(root, "openuispec.yaml"),
      manifestTemplate(name, targets, specDir)
    );

    // ── starter tokens ─────────────────────────────────────────────

    if (wantTokens.toLowerCase().startsWith("y")) {
      writeIfMissing(join(root, "tokens", "color.yaml"), starterColorTokens());
      writeIfMissing(
        join(root, "tokens", "typography.yaml"),
        starterTypographyTokens()
      );
      writeIfMissing(
        join(root, "tokens", "spacing.yaml"),
        starterSpacingTokens()
      );
    }

    // ── starter locale ─────────────────────────────────────────────

    writeIfMissing(
      join(root, "locales", "en.json"),
      starterLocale() + "\n"
    );

    // ── .gitkeep for empty dirs ────────────────────────────────────

    for (const d of dirs) {
      const dir = join(root, d);
      const entries = existsSync(dir)
        ? readdirSync(dir).filter((f) => f !== ".gitkeep")
        : [];
      if (entries.length === 0) {
        const gk = join(dir, ".gitkeep");
        if (!existsSync(gk)) {
          writeFileSync(gk, "");
          console.log(`  create ${relative(cwd, gk)}`);
        }
      }
    }

    // ── AI assistant rules ─────────────────────────────────────────

    if (wantRules.toLowerCase().startsWith("y")) {
      const rules = aiRulesBlock(specDir, targets);

      for (const file of ["CLAUDE.md", "AGENTS.md"]) {
        const filePath = join(cwd, file);
        if (existsSync(filePath)) {
          const existing = readFileSync(filePath, "utf-8");
          if (existing.includes("OpenUISpec")) {
            console.log(`  skip ${file} (already has OpenUISpec rules)`);
            continue;
          }
          appendFileSync(filePath, "\n" + rules);
          console.log(`  update ${file} (appended rules)`);
        } else {
          writeFileSync(filePath, rules.trimStart());
          console.log(`  create ${file}`);
        }
      }
    }

    // ── done ───────────────────────────────────────────────────────

    console.log(`
Done! Your spec project is ready at ./${specDir}/

Next steps:
  1. Edit ${specDir}/openuispec.yaml to define your data model and API
  2. Add screens in ${specDir}/screens/
  3. Add flows in ${specDir}/flows/
  4. Generate code for your target platform
  5. Run \`openuispec drift --snapshot --target ${targets[0]}\` to baseline

Learn more: https://github.com/anthropics/openuispec
`);
  } catch (err) {
    rl.close();
    throw err;
  }
}
