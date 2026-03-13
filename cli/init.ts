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
  const defaultStr = defaults.join(", ");
  const raw = (
    await rl.question(`${question} [${options.join(", ")}] (${defaultStr}): `)
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

## Screen and flow status
Screens and flows have a \`status\` field that controls drift tracking:
- \`stub\` — placeholder, not yet specced. Drift detection skips these.
- \`draft\` — in progress, actively being specced. Tracked by drift.
- \`ready\` — fully specified (default if omitted). Tracked by drift.

When adopting OpenUISpec in an existing project:
1. Create spec files for existing screens as \`status: stub\` initially.
2. When speccing a screen from existing code, change status to \`draft\`.
3. Once the spec is complete and reviewed, change to \`ready\` (or remove the field).
4. Only \`draft\` and \`ready\` screens trigger drift failures in CI.

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
    // 1. Project name (display name in manifest, derived from current folder)
    const cwd = process.cwd();
    const defaultName = cwd.split("/").pop() || "MyApp";
    const name = await ask(rl, "Project name", defaultName);

    // 2. Spec directory
    const specDir = await ask(rl, "Spec directory", "openuispec");

    // 3. Platforms
    const allTargets = ["ios", "android", "web"];
    const targets = await askList(
      rl,
      "\nWhich platforms?",
      allTargets,
      allTargets
    );

    if (targets.length === 0) {
      console.error("At least one target is required.");
      process.exit(1);
    }

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

    // ── done ───────────────────────────────────────────────────────

    console.log(`
Done! Your spec project is ready at ./${specDir}/

Getting started (new project):
  1. Edit ${specDir}/openuispec.yaml — define your data model and API
  2. Create screens in ${specDir}/screens/ (one YAML per screen)
  3. Create flows in ${specDir}/flows/ (multi-step navigation)
  4. Ask AI to generate native code from the spec
  5. Run \`openuispec drift --snapshot --target ${targets[0]}\` to baseline

Getting started (existing project):
  1. Ask AI to read your existing UI code and generate spec files:
     "Read src/screens/HomeScreen.swift and create ${specDir}/screens/home.yaml as status: stub"
  2. Spec screens incrementally: stub → draft → ready
  3. Only ready/draft screens are tracked by drift detection
  4. Run \`openuispec validate\` to check specs against the schema

Commands:
  openuispec validate             Validate spec files
  openuispec drift --target ios   Check for spec changes
  openuispec drift --snapshot --target ios   Save current state

AI rules have been added to CLAUDE.md and AGENTS.md.

Learn more: https://github.com/rsktash/openuispec
`);
  } catch (err) {
    rl.close();
    throw err;
  }
}
