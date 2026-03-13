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

function specReadmeTemplate(name: string, targets: string[]): string {
  const targetList = targets.join(", ");
  return `# ${name} — OpenUISpec

This directory contains the **OpenUISpec** semantic UI specification for **${name}**.

OpenUISpec is a YAML-based format that describes your app's UI semantically — tokens, screens, flows, and platform overrides. AI reads the spec and generates native code (SwiftUI, Compose, React). The spec is the single source of truth across all platforms.

## Directory structure

| Directory | Contents |
|-----------|----------|
| \`tokens/\` | Design tokens — colors, typography, spacing, elevation, motion, icons, themes |
| \`screens/\` | Screen definitions — one YAML file per screen |
| \`flows/\` | Navigation flows — multi-step user journeys |
| \`contracts/\` | Component contracts — custom UI component definitions (\`x_\` prefixed) |
| \`platform/\` | Platform overrides — per-target (iOS, Android, Web) behaviors |
| \`locales/\` | Localization — i18n strings (JSON, ICU MessageFormat) |

## Getting started

**Start here:** read \`openuispec.yaml\` — it's the root manifest that defines the project structure, data model, API endpoints, and generation targets.

### New project (no existing UI code)

1. Define your data model and API endpoints in \`openuispec.yaml\`
2. Create token files in \`tokens/\` (colors, typography, spacing)
3. Create screen specs in \`screens/\` (one YAML per screen)
4. Create navigation flows in \`flows/\`
5. Ask AI to generate native code from the spec

### Existing project (adopting OpenUISpec)

1. Scan the codebase for existing UI screens
2. Create a stub for each screen in \`screens/\`:
   \`\`\`yaml
   screen_name:
     semantic: "Brief description of what this screen does"
     status: stub
     layout:
       type: scroll_vertical
   \`\`\`
3. Extract design tokens (colors, fonts, spacing) into \`tokens/\`
4. Fill in \`data_model\` and \`api.endpoints\` in \`openuispec.yaml\`
5. Spec screens incrementally: \`stub\` → \`draft\` → \`ready\`

## Screen and flow status

- \`stub\` — placeholder, not yet specced. Drift detection skips these.
- \`draft\` — actively being specced. Tracked by drift.
- \`ready\` — fully specified (default if omitted). Tracked by drift.

## Learning OpenUISpec — local files and online reference

All documentation is included in the installed package at \`node_modules/openuispec/\`:
1. **Full specification:** \`node_modules/openuispec/spec/openuispec-v0.1.md\`
2. **Example app:** \`node_modules/openuispec/examples/taskflow/\`
3. **JSON Schemas:** \`node_modules/openuispec/schema/\`

If the package is not in node_modules, fetch the full reference from:
- \`https://openuispec.rsteam.uz/llms-full.txt\` — complete spec + all JSON schemas in one file
- \`https://openuispec.rsteam.uz/llms.txt\` — concise summary with links

## Token file structure — root wrapper key required

Every token file must have a single root key matching the token type. Do NOT put properties at the top level.

\`\`\`yaml
# ✅ Correct — tokens/typography.yaml
typography:
  font_family: ...
  scale: ...

# ❌ Wrong — missing root wrapper key
font_family: ...
scale: ...
\`\`\`

Root keys: \`color\`, \`typography\`, \`spacing\`, \`elevation\`, \`motion\`, \`layout\`, \`themes\`, \`icons\`.

## File formats and schemas

**IMPORTANT:** Before creating or editing any spec file, read the corresponding JSON Schema to understand the valid structure. Do not guess the file format.

| File | Schema | Root key |
|------|--------|----------|
| \`openuispec.yaml\` | \`openuispec.schema.json\` | \`spec_version\` |
| \`screens/*.yaml\` | \`screen.schema.json\` | \`<screen_id>\` |
| \`flows/*.yaml\` | \`flow.schema.json\` | \`<flow_id>\` |
| \`platform/*.yaml\` | \`platform.schema.json\` | \`platform\` |
| \`locales/*.json\` | \`locale.schema.json\` | (object) |
| \`contracts/x_*.yaml\` | \`custom-contract.schema.json\` | \`contract\` |
| \`tokens/color.yaml\` | \`tokens/color.schema.json\` | \`color\` |
| \`tokens/typography.yaml\` | \`tokens/typography.schema.json\` | \`typography\` |
| \`tokens/spacing.yaml\` | \`tokens/spacing.schema.json\` | \`spacing\` |
| \`tokens/elevation.yaml\` | \`tokens/elevation.schema.json\` | \`elevation\` |
| \`tokens/motion.yaml\` | \`tokens/motion.schema.json\` | \`motion\` |
| \`tokens/layout.yaml\` | \`tokens/layout.schema.json\` | \`layout\` |
| \`tokens/themes.yaml\` | \`tokens/themes.schema.json\` | \`themes\` |
| \`tokens/icons.yaml\` | \`tokens/icons.schema.json\` | \`icons\` |

All schemas are in \`node_modules/openuispec/schema/\`. Shared type definitions (actions, data-binding, adaptive, validation, common) are in \`schema/defs/\`.

**Workflow:** read the schema → read an example from \`node_modules/openuispec/examples/taskflow/\` → create the YAML → run \`openuispec validate\`.

## Spec format quick reference

- **7 contract families:** nav_container, surface, action_trigger, input_field, data_display, collection, feedback
- **Custom contracts:** prefixed with \`x_\` (e.g., \`x_media_player\`)
- **Data binding:** \`$data:\`, \`$state:\`, \`$param:\`, \`$t:\` prefixes
- **Actions:** typed objects — navigate, api_call, set_state, confirm, sequence, feedback, etc.
- **Adaptive layout:** size classes (compact, regular, expanded) with per-section overrides

## CLI commands

\`\`\`bash
openuispec validate             # Validate spec files against schemas
openuispec validate screens     # Validate only screens
openuispec drift --target ${targets[0]}    # Check for spec drift
openuispec drift --snapshot --target ${targets[0]}  # Snapshot current state
openuispec drift --all          # Include stubs in drift check
\`\`\`

## Targets

This project generates native code for: **${targetList}**

## Learn more

- Full spec: https://github.com/rsktash/openuispec/blob/main/spec/openuispec-v0.1.md
- Example app: https://github.com/rsktash/openuispec/tree/main/examples/taskflow
- Repository: https://github.com/rsktash/openuispec
`;
}

function aiRulesBlock(specDir: string, targets: string[]): string {
  const targetList = targets.map((t) => `"${t}"`).join(", ");
  return `
# OpenUISpec — AI Assistant Rules
# ================================
# This project uses OpenUISpec to define UI as a semantic spec.
# Spec files are the single source of truth for all UI across platforms.
# Targets: ${targetList}

## What is OpenUISpec
OpenUISpec is a YAML-based spec format that describes an app's UI semantically — tokens, screens, flows, and platform overrides. AI reads the spec and generates native code (SwiftUI, Compose, React). AI reads native code and updates the spec. The spec is the sync layer between platforms.

## Spec location
- Spec root: \`${specDir}/\`
- Manifest: \`${specDir}/openuispec.yaml\` — always read this first.
- Tokens: \`${specDir}/tokens/\` — colors, typography, spacing, motion, icons, themes
- Screens: \`${specDir}/screens/\` — one YAML file per screen
- Flows: \`${specDir}/flows/\` — multi-step navigation journeys
- Contracts: \`${specDir}/contracts/\` — UI component definitions
- Platform: \`${specDir}/platform/\` — per-target overrides (iOS, Android, Web)
- Locales: \`${specDir}/locales/\` — i18n strings (JSON, ICU MessageFormat)

## If spec directories are empty (first-time setup)
This means the project has existing UI code but hasn't been specced yet. Your job:

1. **Find existing screens** — scan the codebase for UI screen files (SwiftUI views, Compose screens, React components/pages).
2. **Create stubs** — for each screen, create \`${specDir}/screens/<name>.yaml\` with:
   \`\`\`yaml
   screen_name:
     semantic: "Brief description of what this screen does"
     status: stub
     layout:
       type: scroll_vertical
   \`\`\`
3. **Extract tokens** — scan the codebase for colors, fonts, spacing values and create token files in \`${specDir}/tokens/\`.
4. **Update the manifest** — fill in \`data_model\` and \`api.endpoints\` in \`${specDir}/openuispec.yaml\` based on the existing code.
5. **Spec screens on demand** — when the user asks to spec a screen, read the native code, create a full spec, and change \`status: draft\` → \`ready\`.

## Screen and flow status
- \`stub\` — placeholder, not yet specced. Drift detection skips these.
- \`draft\` — actively being specced. Tracked by drift.
- \`ready\` — fully specified (default if omitted). Tracked by drift.

## Making UI changes
1. Read the relevant spec files before modifying any UI code.
2. If the change requires a spec update, modify the spec FIRST, then update code.
3. Never modify generated code without updating the spec.
4. When adding a new screen, create the corresponding spec file.
5. When removing a screen, remove the spec file and update flow references.

## After modifying spec files
1. Run \`openuispec validate\` to check specs against the schema.
2. Run \`openuispec drift --snapshot --target <target>\` for each affected platform.
3. Run \`openuispec drift\` to verify no untracked drift remains.

## Learning OpenUISpec — local files and online reference
All documentation is included in the installed package at \`node_modules/openuispec/\`:
1. **Full specification:** \`node_modules/openuispec/spec/openuispec-v0.1.md\` — the complete spec (read this to understand the format)
2. **Example app:** \`node_modules/openuispec/examples/taskflow/\` — a complete working app with all file types
3. **JSON Schemas:** \`node_modules/openuispec/schema/\` — validation schemas that define the exact structure of every file type

If the package is not in node_modules, fetch the full reference from:
- \`https://openuispec.rsteam.uz/llms-full.txt\` — complete spec + all JSON schemas in one file
- \`https://openuispec.rsteam.uz/llms.txt\` — concise summary with links

## Token file structure — root wrapper key required
Every token file must have a single root key matching the token type. Do NOT put properties at the top level.
- \`tokens/color.yaml\` → root key: \`color\`
- \`tokens/typography.yaml\` → root key: \`typography\`
- \`tokens/spacing.yaml\` → root key: \`spacing\`
- \`tokens/elevation.yaml\` → root key: \`elevation\`
- \`tokens/motion.yaml\` → root key: \`motion\`
- \`tokens/layout.yaml\` → root key: \`layout\`
- \`tokens/themes.yaml\` → root key: \`themes\`
- \`tokens/icons.yaml\` → root key: \`icons\`

## File formats and schemas — read before creating spec files
Before creating or editing any spec file, read the corresponding JSON Schema. Do not guess the file format.

| File | Schema (in \`node_modules/openuispec/schema/\`) | Root key |
|------|--------|----------|
| \`openuispec.yaml\` | \`openuispec.schema.json\` | \`spec_version\` |
| \`screens/*.yaml\` | \`screen.schema.json\` | \`<screen_id>\` |
| \`flows/*.yaml\` | \`flow.schema.json\` | \`<flow_id>\` |
| \`platform/*.yaml\` | \`platform.schema.json\` | \`platform\` |
| \`locales/*.json\` | \`locale.schema.json\` | (object) |
| \`contracts/x_*.yaml\` | \`custom-contract.schema.json\` | \`contract\` |
| \`tokens/color.yaml\` | \`tokens/color.schema.json\` | \`color\` |
| \`tokens/typography.yaml\` | \`tokens/typography.schema.json\` | \`typography\` |
| \`tokens/spacing.yaml\` | \`tokens/spacing.schema.json\` | \`spacing\` |
| \`tokens/elevation.yaml\` | \`tokens/elevation.schema.json\` | \`elevation\` |
| \`tokens/motion.yaml\` | \`tokens/motion.schema.json\` | \`motion\` |
| \`tokens/layout.yaml\` | \`tokens/layout.schema.json\` | \`layout\` |
| \`tokens/themes.yaml\` | \`tokens/themes.schema.json\` | \`themes\` |
| \`tokens/icons.yaml\` | \`tokens/icons.schema.json\` | \`icons\` |

Shared type definitions (actions, data-binding, adaptive, validation, common) are in \`schema/defs/\`.

Workflow: read the schema → read an example from \`node_modules/openuispec/examples/taskflow/\` → create the YAML → run \`openuispec validate\`.

## Spec format reference
- 7 contract families: nav_container, surface, action_trigger, input_field, data_display, collection, feedback
- Custom contracts: prefixed with \`x_\` (e.g., \`x_media_player\`)
- Data binding: \`$data:\`, \`$state:\`, \`$param:\`, \`$t:\` prefixes
- Actions: typed objects (navigate, api_call, set_state, confirm, sequence, feedback, etc.)
- Adaptive layout: size classes (compact, regular, expanded) with per-section overrides

## CLI commands
- \`openuispec init\` — scaffold a new spec project
- \`openuispec validate [group...]\` — validate spec files against schemas
- \`openuispec drift --target <t>\` — check for spec drift
- \`openuispec drift --snapshot --target <t>\` — snapshot current state
- \`openuispec drift --all\` — include stubs in drift check
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

    // ── spec README ──────────────────────────────────────────────

    writeIfMissing(
      join(root, "README.md"),
      specReadmeTemplate(name, targets)
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
