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
import { join, relative, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SUPPORTED_TARGETS, isSupportedTarget, type SupportedTarget } from "../drift/index.js";

// ── list-options ────────────────────────────────────────────────────

export type InitOptionsResponse = {
  command: "init";
  note: string;
  questions: Array<{
    key: string;
    prompt: string;
    type: "text" | "list" | "yes_no";
    default: string | string[] | boolean;
    options?: string[];
  }>;
  configure_targets_note: string;
};

export function listInitOptions(): InitOptionsResponse {
  const defaults = collectDefaults();
  return {
    command: "init",
    note: "After init, run `openuispec configure-target <target> --list-options` for each target to get stack choices.",
    questions: [
      {
        key: "name",
        prompt: "Project name",
        type: "text",
        default: defaults.name,
      },
      {
        key: "spec_dir",
        prompt: "Spec directory",
        type: "text",
        default: defaults.specDir,
      },
      {
        key: "targets",
        prompt: "Which platforms?",
        type: "list",
        default: defaults.targets,
        options: [...SUPPORTED_TARGETS],
      },
      {
        key: "with_api",
        prompt: "Will this spec declare API endpoints?",
        type: "yes_no",
        default: defaults.withApi,
      },
      {
        key: "backend_path",
        prompt: "Backend folder path relative to openuispec.yaml",
        type: "text",
        default: defaults.backendPath ?? "../backend/",
      },
      {
        key: "configure_targets",
        prompt: "Configure target stacks now?",
        type: "yes_no",
        default: defaults.configureTargets,
      },
    ],
    configure_targets_note:
      "If configure_targets is true, use `openuispec configure-target <target> --list-options` for each target after init to present stack choices to the user.",
  };
}

// ── prompts ──────────────────────────────────────────────────────────

export async function ask(
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

export async function askChoice(
  rl: ReturnType<typeof createInterface>,
  question: string,
  options: string[],
  fallback: string
): Promise<string> {
  const answer = (await rl.question(`${question} [${options.join(", ")}] (${fallback}): `))
    .trim()
    .toLowerCase();
  if (!answer) return fallback;
  return options.includes(answer) ? answer : fallback;
}

async function askYesNo(
  rl: ReturnType<typeof createInterface>,
  question: string,
  fallback: boolean
): Promise<boolean> {
  const answer = await askChoice(rl, question, ["yes", "no"], fallback ? "yes" : "no");
  return answer === "yes";
}

// ── scaffold ─────────────────────────────────────────────────────────

function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

function writeIfMissing(path: string, content: string, quiet = false): boolean {
  if (existsSync(path)) {
    if (!quiet) console.log(`  skip ${relative(process.cwd(), path)} (exists)`);
    return false;
  }
  writeFileSync(path, content);
  if (!quiet) console.log(`  create ${relative(process.cwd(), path)}`);
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
  options: { withApi: boolean; backendPath: string | null }
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
${options.withApi ? `  code_roots:
    backend: "${options.backendPath}"                # Required when api.endpoints are declared
` : ""}  output_format:
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
1. \`README.md\` — schema tables, file format reference, root wrapper keys
2. \`spec/openuispec-v0.1.md\` — full specification (contracts, layout, expressions, etc.)
3. \`examples/taskflow/openuispec/\` — complete working example with all file types
4. \`schema/\` — JSON Schemas for validation

## MCP Tools (recommended for AI assistants)

When the openuispec MCP server is configured (see \`.claude.json\`), AI assistants should use these tools instead of CLI commands:

| Tool | When to use |
|------|-------------|
| \`openuispec_prepare\` | **Before any UI code generation.** Returns spec context, platform config, and constraints. |
| \`openuispec_check\` | After editing spec files. Validates schema + semantics + readiness. |
| \`openuispec_status\` | To understand cross-target state (baselines, drift, next steps). |
| \`openuispec_validate\` | Schema-only validation, optionally by group. |
| \`openuispec_drift\` | Detect spec changes since last snapshot. |

## CLI commands

\`\`\`bash
openuispec validate             # Validate spec files against schemas
openuispec validate semantic    # Run semantic cross-reference linting
openuispec configure-target ${targets[0]} [--defaults] # Configure target stack; --defaults stays unconfirmed
openuispec status               # Show cross-target baseline/drift status
openuispec drift --target ${targets[0]} --explain   # Explain semantic spec drift
openuispec prepare --target ${targets[0]}          # Build the target work bundle
openuispec drift --snapshot --target ${targets[0]} # Snapshot current state + git baseline after target output exists
\`\`\`

The target work bundle has two modes:
- \`bootstrap\` when no snapshot exists yet, for first-time generation
- \`update\` after a snapshot exists, for drift-based target updates

If target stack values were written with \`--defaults\`, treat them as unconfirmed. Before generating code, ask the user to confirm or change the stack and run \`openuispec configure-target <target>\` without \`--defaults\`.

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

## MANDATORY — UI work requires OpenUISpec tools

When the user's request involves UI — screens, navigation, layout, tokens, flows, localization,
or any visual/structural change — you MUST use the OpenUISpec tools before writing any code.

### MCP Tools (use these when available)

Call these MCP tools directly. They return structured JSON with everything you need.

1. **Before ANY UI code generation or modification:**
   Call \`openuispec_prepare\` with the target platform. This returns the spec context,
   platform config, generation constraints, and semantic changes. Do not skip this step.

2. **After editing spec files:**
   Call \`openuispec_check\` to validate schema + semantic lint + prepare readiness.

3. **To understand project state:**
   Call \`openuispec_status\` for cross-target summary.

4. **To detect what changed:**
   Call \`openuispec_drift\` with \`explain: true\` to see property-level spec changes.

5. **For schema validation only:**
   Call \`openuispec_validate\` optionally with specific groups.

### CLI fallback (when MCP is not available)

If MCP tools are not available, use these CLI commands with \`--json\` flag:
- \`openuispec prepare --target <t> --json\` — build AI-ready work bundle
- \`openuispec check --target <t> --json\` — composite validation
- \`openuispec status --json\` — cross-target status
- \`openuispec drift --target <t> --explain --json\` — semantic drift
- \`openuispec validate [group...] --json\` — schema validation

### Other CLI commands
- \`openuispec init\` — scaffold a new spec project
- \`openuispec drift --snapshot --target <t>\` — snapshot current state (only after UI code is updated)
- \`openuispec configure-target <t>\` — configure target platform stack
- \`openuispec update-rules\` — update AI rules to match installed package version

## Spec format reference

The spec format, schemas, and generation rules are in the installed \`openuispec\` package.
You MUST read the reference files before creating or editing spec files — do NOT guess the format.

**Find the package:** \`node_modules/openuispec/\` or run \`npm root -g\` → \`<prefix>/openuispec/\`.
**Online fallback:** \`https://openuispec.rsteam.uz/llms-full.txt\`

**Reference files (read in order):**
1. \`README.md\` — schema tables, file format, root wrapper keys
2. \`spec/openuispec-v0.1.md\` — full specification
3. \`examples/taskflow/openuispec/\` — complete working example
4. \`schema/\` — JSON Schemas for every file type

## Spec location
- Spec root: \`${specDir}/\` — read \`${specDir}/openuispec.yaml\` first for actual paths.
- Default dirs: tokens/, screens/, flows/, contracts/, platform/, locales/

## When to start from spec vs platform code

**Spec-first** (use \`openuispec_prepare\` or \`openuispec prepare\`):
- Screen structure, navigation, fields, actions, validation, data binding changes
- Token, variant, contract, flow, or localization changes
- Changes affecting multiple platforms
- Requests in product/UI terms

**Platform-first** (skip spec tools):
- Platform-specific polish (iOS-only, Android-only, web-only)
- Local bug fixes that don't alter shared semantic behavior

## If spec directories are empty (first-time setup)

Read \`spec/openuispec-v0.1.md\` from the package first, then:
1. Scan codebase for UI screens → create \`${specDir}/screens/<name>.yaml\` as \`status: stub\`
2. Extract tokens (colors, fonts, spacing) → \`${specDir}/tokens/\`
3. Create contract extensions → \`${specDir}/contracts/\`
4. Create locale files → \`${specDir}/locales/<locale>.json\`
5. Fill in \`data_model\`, \`api.endpoints\` in \`${specDir}/openuispec.yaml\`

## Rules
- Do not snapshot drift unless the UI code has also been updated.
- Do not modify generated UI without checking whether the spec must change first.
- Do not use \`configure-target --defaults\` as silent approval — ask the user to confirm.
- Always read spec format from the installed package, not from cached/memorized content.
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
  let targets = [...SUPPORTED_TARGETS];
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

  // Ensure MCP server is configured
  const claudeJsonPath = join(cwd, ".claude.json");
  const mcpConfig = {
    command: "npx",
    args: ["openuispec-mcp"],
  };

  try {
    let claudeJson: Record<string, any> = {};
    try {
      claudeJson = JSON.parse(readFileSync(claudeJsonPath, "utf-8"));
    } catch {
      // file doesn't exist or isn't valid JSON — start fresh
    }
    if (!claudeJson.mcpServers) claudeJson.mcpServers = {};
    if (!claudeJson.mcpServers.openuispec) {
      claudeJson.mcpServers.openuispec = mcpConfig;
      writeFileSync(claudeJsonPath, JSON.stringify(claudeJson, null, 2) + "\n");
      console.log(`  create .claude.json (MCP server configured)`);
      console.log(`\n  Restart Claude Code to activate the MCP server.`);
    }
  } catch {
    // non-critical — skip silently
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

interface InitOptions {
  defaults: boolean;
  quiet: boolean;
  name?: string;
  specDir?: string;
  targets?: string[];
  withApi?: boolean;
  backendPath?: string;
  configureTargets?: boolean;
}

interface InitAnswers {
  name: string;
  specDir: string;
  targets: string[];
  withApi: boolean;
  backendPath: string | null;
  configureTargets: boolean;
}

function parseTargetsValue(raw: string): string[] {
  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is SupportedTarget => isSupportedTarget(value));
}

function requireFlagValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    console.error(`Error: ${flag} requires a value.`);
    process.exit(1);
  }
  return value;
}

function parseInitArgs(argv: string[]): InitOptions {
  const options: InitOptions = { defaults: argv.includes("--defaults"), quiet: argv.includes("--quiet") };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    switch (arg) {
      case "--defaults":
      case "--quiet":
        break;
      case "--name":
        options.name = requireFlagValue(argv, index, arg);
        index++;
        break;
      case "--spec-dir":
        options.specDir = requireFlagValue(argv, index, arg);
        index++;
        break;
      case "--targets":
        options.targets = parseTargetsValue(requireFlagValue(argv, index, arg));
        index++;
        break;
      case "--backend":
        options.backendPath = requireFlagValue(argv, index, arg);
        index++;
        break;
      case "--with-api":
        options.withApi = true;
        break;
      case "--no-api":
        options.withApi = false;
        break;
      case "--configure-targets":
        options.configureTargets = true;
        break;
      case "--no-configure-targets":
        options.configureTargets = false;
        break;
      default:
        if (arg.startsWith("--")) {
          console.error(`Error: Unknown init option: ${arg}`);
          process.exit(1);
        }
    }
  }

  return options;
}

function collectDefaults(): InitAnswers {
  const cwd = process.cwd();
  const defaultName = cwd.split("/").pop() || "MyApp";
  return {
    name: defaultName,
    specDir: "openuispec",
    targets: [...SUPPORTED_TARGETS],
    withApi: true,
    backendPath: "../backend/",
    configureTargets: true,
  };
}

async function collectInteractiveAnswers(rl: ReturnType<typeof createInterface>): Promise<InitAnswers> {
  const defaults = collectDefaults();
  const name = await ask(rl, "Project name", defaults.name);
  const specDir = await ask(rl, "Spec directory", defaults.specDir);
  const targets = await askList(rl, "\nWhich platforms?", [...SUPPORTED_TARGETS], defaults.targets);

  if (targets.length === 0) {
    console.error("At least one target is required.");
    process.exit(1);
  }

  const withApi = await askYesNo(rl, "Will this spec declare API endpoints?", defaults.withApi);
  const backendPath = withApi
    ? await ask(rl, "Backend folder path relative to openuispec.yaml", defaults.backendPath ?? "../backend/")
    : null;
  const configureTargets = await askYesNo(rl, "Configure target stacks now?", defaults.configureTargets);

  return {
    name,
    specDir,
    targets,
    withApi,
    backendPath,
    configureTargets,
  };
}

function collectNonInteractiveAnswers(argv: string[]): InitAnswers {
  const parsed = parseInitArgs(argv);
  const defaults = collectDefaults();

  if (!parsed.defaults && argv.filter((a) => a !== "--quiet").length === 0) {
    console.error(
      "Error: `openuispec init` needs a TTY for prompts.\n" +
        "Run with `--list-options` to get prompt definitions as JSON, or pass flags such as `--name`, `--targets`, `--with-api`, `--backend`, and `--configure-targets`."
    );
    process.exit(1);
  }

  const targets = parsed.targets && parsed.targets.length > 0 ? parsed.targets : defaults.targets;
  if (targets.length === 0) {
    console.error("Error: --targets must include at least one of ios, android, web.");
    process.exit(1);
  }

  const withApi = parsed.withApi ?? defaults.withApi;
  const backendPath = withApi ? parsed.backendPath ?? defaults.backendPath : null;

  return {
    name: parsed.name ?? defaults.name,
    specDir: parsed.specDir ?? defaults.specDir,
    targets,
    withApi,
    backendPath,
    configureTargets: parsed.configureTargets ?? defaults.configureTargets,
  };
}

// ── main ─────────────────────────────────────────────────────────────

export async function init(argv: string[] = []): Promise<void> {
  if (argv.includes("--list-options")) {
    console.log(JSON.stringify(listInitOptions(), null, 2));
    return;
  }

  const quiet = argv.includes("--quiet");
  const interactive = stdin.isTTY && stdout.isTTY && !argv.includes("--defaults");
  const rl = interactive ? createInterface({ input: stdin, output: stdout }) : null;

  if (!quiet) console.log("\nOpenUISpec — Project Setup\n");

  try {
    const cwd = process.cwd();
    const answers = rl ? await collectInteractiveAnswers(rl) : collectNonInteractiveAnswers(argv);
    rl?.close();

    // ── create folders ─────────────────────────────────────────────

    if (!quiet) console.log("\nScaffolding...\n");

    const root = join(cwd, answers.specDir);
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
      manifestTemplate(answers.name, answers.targets, {
        withApi: answers.withApi,
        backendPath: answers.backendPath,
      }),
      quiet
    );

    // ── spec README ──────────────────────────────────────────────

    writeIfMissing(
      join(root, "README.md"),
      specReadmeTemplate(answers.name, answers.targets),
      quiet
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
          if (!quiet) console.log(`  create ${relative(cwd, gk)}`);
        }
      }
    }

    // ── AI assistant rules ─────────────────────────────────────────

    const rules = aiRulesBlock(answers.specDir, answers.targets);

    for (const file of ["CLAUDE.md", "AGENTS.md"]) {
      const filePath = join(cwd, file);
      if (existsSync(filePath)) {
        const existing = readFileSync(filePath, "utf-8");
        if (existing.includes("OpenUISpec")) {
          if (!quiet) console.log(`  skip ${file} (already has OpenUISpec rules)`);
          continue;
        }
        appendFileSync(filePath, "\n" + rules);
        if (!quiet) console.log(`  update ${file} (appended rules)`);
      } else {
        writeFileSync(filePath, rules.trimStart());
        if (!quiet) console.log(`  create ${file}`);
      }
    }

    // ── MCP server configuration ────────────────────────────────────

    const claudeJsonPath = join(cwd, ".claude.json");
    const mcpConfig = {
      command: "npx",
      args: ["openuispec-mcp"],
    };

    try {
      let claudeJson: Record<string, any> = {};
      try {
        claudeJson = JSON.parse(readFileSync(claudeJsonPath, "utf-8"));
      } catch {
        // file doesn't exist or isn't valid JSON — start fresh
      }
      if (!claudeJson.mcpServers) claudeJson.mcpServers = {};
      if (!claudeJson.mcpServers.openuispec) {
        claudeJson.mcpServers.openuispec = mcpConfig;
        writeFileSync(claudeJsonPath, JSON.stringify(claudeJson, null, 2) + "\n");
        if (!quiet) console.log(`  create .claude.json (MCP server configured)`);
      } else {
        if (!quiet) console.log(`  skip .claude.json (openuispec MCP already configured)`);
      }
    } catch {
      if (!quiet) console.log(`  skip .claude.json (could not configure MCP server)`);
    }

    if (answers.configureTargets) {
      if (!quiet) console.log("\nConfiguring target stacks...\n");
      const { runConfigureTarget } = await import("./configure-target.js");
      for (const target of answers.targets) {
        await runConfigureTarget([target, ...(interactive ? [] : ["--defaults"]), ...(quiet ? ["--silent"] : [])]);
      }
    }

    // ── done ───────────────────────────────────────────────────────

    if (quiet) {
      console.log(`./${answers.specDir}/`);
    } else {
      console.log(`
Done! Your spec project is ready at ./${answers.specDir}/

Getting started (new project):
  1. Edit ${answers.specDir}/openuispec.yaml — define your data model and API
  2. Create tokens in ${answers.specDir}/tokens/ (colors, typography, spacing, etc.)
  3. Create contract extensions in ${answers.specDir}/contracts/ (visual variants for the 7 built-in contracts)
  4. Create screens in ${answers.specDir}/screens/ (one YAML per screen)
  5. Create flows in ${answers.specDir}/flows/ (multi-step navigation)
  6. Create locale files in ${answers.specDir}/locales/ (one JSON per supported locale)
  7. Run \`openuispec validate\` and \`openuispec validate semantic\` to check everything
  8. Ask AI to generate native code from the spec
  9. Run \`openuispec drift --snapshot --target ${answers.targets[0]}\` to baseline the first accepted target state after that target output directory exists

Getting started (existing project):
  1. Ask AI to read your existing UI code and generate spec files:
     "Read src/screens/HomeScreen.swift and create ${answers.specDir}/screens/home.yaml as status: stub"
  2. Spec screens incrementally: stub → draft → ready
  3. Only ready/draft screens are tracked by drift detection
  4. Run \`openuispec validate\` to check specs against the schema
  5. Use \`openuispec prepare --target ${answers.targets[0]}\` before first-time generation, then use \`openuispec drift --target ${answers.targets[0]} --explain\` and \`openuispec prepare --target ${answers.targets[0]}\` before asking AI to update a target

Commands:
  openuispec validate             Validate spec files
  openuispec validate semantic   Check semantic cross-references
  openuispec configure-target ios [--defaults]   Configure target stack; --defaults stays unconfirmed
  openuispec status   Show cross-target baseline/drift status
  openuispec drift --target ios --explain   Explain semantic spec changes
  openuispec prepare --target ios   Build the target work bundle
  openuispec drift --snapshot --target ios   Save current state + git baseline after target output exists

AI rules have been added to CLAUDE.md and AGENTS.md.
MCP server configured in .claude.json (AI assistants will use openuispec tools automatically).

Docs: https://openuispec.rsteam.uz
`);
    }
  } catch (err) {
    rl?.close();
    throw err;
  }
}
