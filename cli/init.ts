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
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

// ── version ─────────────────────────────────────────────────────────

const RULES_START_MARKER = "<!-- openuispec-rules-start -->";
const RULES_END_MARKER = "<!-- openuispec-rules-end -->";

function getPackageVersion(): string {
  const pkgPath = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "package.json"
  );
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  return pkg.version;
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
  # output_dir:                          # Optional: map targets to code directories
  #   ios: "../ios-app/"                  # relative to this file
  #   android: "../android-app/"
  #   web: "../web-ui/"
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

**Start here:** read \`openuispec.yaml\` — it defines the project structure, data model, API endpoints, and generation targets (**${targetList}**).

## Directory structure

| Directory | Contents |
|-----------|----------|
| \`tokens/\` | Design tokens — colors, typography, spacing, elevation, motion, icons, themes |
| \`screens/\` | Screen definitions — one YAML file per screen |
| \`flows/\` | Navigation flows — multi-step user journeys |
| \`contracts/\` | Component contracts — standard extensions and custom (\`x_\` prefixed) |
| \`platform/\` | Platform overrides — per-target (iOS, Android, Web) behaviors |
| \`locales/\` | Localization — i18n strings (JSON, ICU MessageFormat) |

## IMPORTANT — Read the specification before working with spec files

The spec format, file schemas, and generation rules are defined in the installed \`openuispec\` package.
You MUST read these reference files before creating, editing, or generating from any spec file.
Do NOT guess the file format — skipping this step will produce invalid YAML that fails validation.

**Find the package in this order:**
1. \`node_modules/openuispec/\` (project dependency)
2. Run \`npm root -g\` → \`<prefix>/openuispec/\` (global install)
3. Online: \`https://openuispec.rsteam.uz/llms-full.txt\` (if not installed)

**Reference files inside the package (read in this order):**
1. \`README.md\` — schema tables, file format reference, root keys
2. \`spec/openuispec-v0.1.md\` — full specification (contracts, layout, expressions, etc.)
3. \`examples/taskflow/\` — complete working example with all file types
4. \`schema/\` — JSON Schemas for validation

## CLI commands

\`\`\`bash
openuispec validate             # Validate spec files against schemas
openuispec validate screens     # Validate only screens
openuispec drift --target ${targets[0]}    # Check for spec drift
openuispec drift --snapshot --target ${targets[0]}  # Snapshot current state
\`\`\`

## Learn more

Docs: https://openuispec.rsteam.uz
`;
}

function aiRulesBlock(specDir: string, targets: string[]): string {
  const targetList = targets.map((t) => `"${t}"`).join(", ");
  const version = getPackageVersion();
  return `
${RULES_START_MARKER}
<!-- openuispec-rules-version: ${version} -->
# OpenUISpec — AI Assistant Rules
# ================================
# This project uses OpenUISpec to define UI as a semantic spec.
# Spec files are the single source of truth for all UI across platforms.
# Targets: ${targetList}

## IMPORTANT — Read the specification before working with spec files

The spec format, file schemas, and generation rules are defined in the installed \`openuispec\` package.
You MUST read the reference files listed below before creating, editing, or generating from any spec file.
Do NOT guess the file format — skipping this step will produce invalid YAML that fails validation.

**Find the package in this order:**
1. \`node_modules/openuispec/\` (project dependency)
2. Run \`npm root -g\` → \`<prefix>/openuispec/\` (global install)
3. Online: \`https://openuispec.rsteam.uz/llms-full.txt\` (if not installed)

**Reference files inside the package (read in this order):**
1. \`README.md\` — schema tables, file format reference, root wrapper keys
2. \`spec/openuispec-v0.1.md\` — full specification (contracts, layout, expressions, adaptive, etc.)
3. \`examples/taskflow/\` — complete working example with all file types
4. \`schema/\` — JSON Schemas for every file type

These files are updated with each package version. Always read from the installed package,
not from cached or memorized content, to ensure you use the latest spec.

## What is OpenUISpec
OpenUISpec is a YAML-based spec format that describes an app's UI semantically — tokens, screens, flows, and platform overrides. AI reads the spec and generates native code (SwiftUI, Compose, React). AI reads native code and updates the spec. The spec is the sync layer between platforms.

## Spec location
- Spec root: \`${specDir}/\`
- Manifest: \`${specDir}/openuispec.yaml\` — always read this first.
- Tokens: \`${specDir}/tokens/\`
- Screens: \`${specDir}/screens/\`
- Flows: \`${specDir}/flows/\`
- Contracts: \`${specDir}/contracts/\`
- Platform: \`${specDir}/platform/\`
- Locales: \`${specDir}/locales/\`

**Note:** These are the default paths. Actual paths are in \`includes:\` in \`openuispec.yaml\` and may use relative paths. Always read \`openuispec.yaml\` to find the real directories.

## If spec directories are empty (first-time setup)
This means the project has existing UI code but hasn't been specced yet. Your job:

1. **Read the spec first** — find and read \`spec/openuispec-v0.1.md\` from the installed package.
2. **Find existing screens** — scan the codebase for UI screen files.
3. **Create stubs** — for each screen, create \`${specDir}/screens/<name>.yaml\` with:
   \`\`\`yaml
   screen_name:
     semantic: "Brief description of what this screen does"
     status: stub
     layout:
       type: scroll_vertical
   \`\`\`
4. **Extract tokens** — scan for colors, fonts, spacing and create files in \`${specDir}/tokens/\`.
5. **Update the manifest** — fill in \`data_model\` and \`api.endpoints\` in \`${specDir}/openuispec.yaml\`.

## OpenUISpec Source Of Truth

OpenUISpec spec files are the primary source of truth for UI behavior across platforms.

### Start from spec when:
- the request changes screen structure
- the request changes navigation
- the request changes fields, actions, validation, or data binding
- the request changes tokens, variants, contracts, flows, or localization
- the request affects more than one platform
- the request is phrased in product/UI terms rather than platform-code terms

Spec-first workflow:
1. Read \`${specDir}/openuispec.yaml\` and the relevant spec files first.
2. Update the spec first.
3. Update the affected generated/native UI code to match the spec.
4. Run \`openuispec validate\`.
5. Verify the affected UI targets build/run if possible.
6. Only then run \`openuispec drift --snapshot --target <target>\` for affected targets.
7. Run \`openuispec drift --target <target>\` as a bookkeeping check.

### Start from platform code when:
- the change is platform-specific polish
- the change is a local bug fix that does not alter shared semantic behavior
- the request explicitly asks for an iOS-only, Android-only, or web-only adjustment

Platform-first workflow:
1. Update native/platform code.
2. If the change affects shared semantics, sync the spec afterward.
3. If the change is intentionally platform-specific, document it in \`platform/*.yaml\` when appropriate.

### Never do this:
- Do not snapshot drift immediately after changing spec unless the UI code has also been updated.
- Do not treat \`openuispec drift\` as proof that generated UI matches the spec.
- Do not modify generated UI without checking whether the spec must change first.

## CLI commands
- \`openuispec init\` — scaffold a new spec project
- \`openuispec validate [group...]\` — validate spec files against schemas
- \`openuispec drift --target <t>\` — check for spec drift
- \`openuispec drift --snapshot --target <t>\` — snapshot current state
- \`openuispec update-rules\` — update AI rules to match installed package version
- \`openuispec drift --all\` — include stubs in drift check
${RULES_END_MARKER}
`;
}

// ── update-rules ────────────────────────────────────────────────────

export function updateRules(): void {
  const cwd = process.cwd();
  const version = getPackageVersion();

  // Detect spec dir from existing openuispec.yaml
  let specDir = "openuispec";
  for (const candidate of ["openuispec", "spec", "."]) {
    if (existsSync(join(cwd, candidate, "openuispec.yaml"))) {
      specDir = candidate;
      break;
    }
  }

  // Detect targets from manifest
  let targets = ["ios", "android", "web"];
  try {
    const manifest = readFileSync(
      join(cwd, specDir, "openuispec.yaml"),
      "utf-8"
    );
    const match = manifest.match(/targets:\s*\[([^\]]+)\]/);
    if (match) {
      targets = match[1].split(",").map((t) => t.trim().replace(/['"]/g, ""));
    }
  } catch {}

  const rules = aiRulesBlock(specDir, targets);
  let updated = 0;

  for (const file of ["CLAUDE.md", "AGENTS.md"]) {
    const filePath = join(cwd, file);
    if (!existsSync(filePath)) continue;

    const content = readFileSync(filePath, "utf-8");

    // Try marker-based replacement first
    const startIdx = content.indexOf(RULES_START_MARKER);
    const endIdx = content.indexOf(RULES_END_MARKER);

    if (startIdx !== -1 && endIdx !== -1) {
      const before = content.slice(0, startIdx);
      const after = content.slice(endIdx + RULES_END_MARKER.length);
      writeFileSync(filePath, before + rules.trimStart().trimEnd() + after);
      console.log(`  updated ${file} (v${version})`);
      updated++;
      continue;
    }

    // Fallback: find the OpenUISpec rules block by header pattern
    // The block runs from the header to EOF (it's always the last content)
    const headerIdx = content.indexOf("# OpenUISpec — AI Assistant Rules");
    if (headerIdx !== -1) {
      const before = content.slice(0, headerIdx);
      const newContent = before + rules.trimStart().trimEnd() + "\n";
      writeFileSync(filePath, newContent);
      console.log(`  updated ${file} (v${version}, migrated to markers)`);
      updated++;
      continue;
    }

    console.log(`  skip ${file} (no OpenUISpec rules block found)`);
  }

  if (updated === 0) {
    console.log(
      "No CLAUDE.md or AGENTS.md with OpenUISpec rules found.\nRun `openuispec init` first."
    );
  } else {
    console.log(`\nAI rules updated to v${version}`);
  }
}

/**
 * Extract the rules version from a CLAUDE.md / AGENTS.md file.
 * Returns null if no version marker is found.
 */
export function extractRulesVersion(filePath: string): string | null {
  if (!existsSync(filePath)) return null;
  const content = readFileSync(filePath, "utf-8");
  const match = content.match(
    /<!-- openuispec-rules-version:\s*([^\s]+)\s*-->/
  );
  return match ? match[1] : null;
}

export { getPackageVersion };

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

Docs: https://openuispec.rsteam.uz
`);
  } catch (err) {
    rl.close();
    throw err;
  }
}
