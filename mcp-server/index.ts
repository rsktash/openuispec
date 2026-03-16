#!/usr/bin/env -S npx tsx
/**
 * OpenUISpec MCP Server
 *
 * Exposes OpenUISpec CLI commands as MCP tools so AI assistants
 * can call them directly instead of relying on CLAUDE.md instructions.
 *
 * Usage:
 *   npx openuispec-mcp                           # stdio transport
 *   OPENUISPEC_PROJECT_DIR=/path npx openuispec-mcp  # explicit project dir
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SUPPORTED_TARGETS, findProjectDir, discoverSpecFiles } from "../drift/index.js";
import { buildPrepareResult } from "../prepare/index.js";
import { buildCheckResult } from "../check/index.js";
import { buildStatusResult } from "../status/index.js";
import { buildValidateResult } from "../schema/validate.js";
import { loadTargetDrift } from "../drift/index.js";
import { readFileSync as fsReadFileSync, existsSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";
import YAML from "yaml";

// ── resolve project cwd ──────────────────────────────────────────────

const projectCwd = process.env.OPENUISPEC_PROJECT_DIR || process.cwd();

// ── read package version ─────────────────────────────────────────────

function getPackageVersion(): string {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

// ── shared tool helpers ──────────────────────────────────────────────

const targetSchema = z.enum(SUPPORTED_TARGETS).describe("Target platform");

function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function toolResult(data: unknown): { content: [{ type: "text"; text: string }] } {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function toolError(err: unknown): { content: [{ type: "text"; text: string }]; isError: true } {
  return { content: [{ type: "text" as const, text: `Error: ${formatError(err)}` }], isError: true };
}

// ── create server ────────────────────────────────────────────────────

const server = new McpServer(
  {
    name: "openuispec",
    version: getPackageVersion(),
  },
  {
    instructions: `This project uses OpenUISpec — a semantic UI specification format.
Spec files (YAML) are the single source of truth for all UI across platforms.

MANDATORY WORKFLOW for any UI-related request (screens, navigation, layout, tokens, flows, localization):

PRE-GENERATION:
1. Call openuispec_prepare with the target platform.
2. Call openuispec_read_specs to load the spec file contents you need.
   Use the returned contents as the AUTHORITATIVE source — do NOT paraphrase from memory.
   Cross-reference exact token values, contract must_handle lists, and locale keys from the content.
3. If the request requires spec changes, update the spec files FIRST, then call openuispec_check.
4. Generate or update the platform UI code based on the spec contents.

POST-GENERATION (do this EVERY TIME after writing UI code):
5. Call openuispec_check to validate spec integrity.
6. Call openuispec_read_specs for the screens/contracts you just generated code for.
7. Audit your generated code against the spec contents. For each screen, verify:
   - Every field/action in the spec has a corresponding UI element
   - Token values (colors, spacing, radii) match the spec exactly, not approximations
   - Contract must_handle states are all implemented (loading, error, empty, etc.)
   - Adaptive breakpoints match the layout size_classes in the spec
   - Locale keys match $t: references in the spec
   - Navigation targets match flow definitions
   Report any real gaps found and fix them before finishing.

CREATING NEW SPEC FILES:
When you need to create or edit spec files and are unsure of the format:
1. Call openuispec_spec_types to discover available spec types.
2. Call openuispec_spec_schema with the specific type to get the full JSON schema.
3. Write the spec file following the schema exactly.

Skip these tools ONLY when the request is purely non-UI (API logic, database, infrastructure, etc.)
or explicitly platform-specific polish that doesn't affect shared UI semantics.`,
  }
);

// ── tool: openuispec_prepare ─────────────────────────────────────────

server.registerTool(
  "openuispec_prepare",
  {
    description: "Build AI-ready work bundle for a target platform. REQUIRED before any UI code generation. Returns spec context, platform config, semantic changes, and generation constraints. Call openuispec_read_specs afterward to load the actual spec file contents you need for generation.",
    inputSchema: { target: targetSchema },
  },
  async ({ target }) => {
    try {
      return toolResult(buildPrepareResult(target, projectCwd));
    } catch (err) {
      return toolError(err);
    }
  }
);

// ── tool: openuispec_check ───────────────────────────────────────────

function buildAuditChecklist(projectDir: string, target: string): string {
  const lines: string[] = [
    "POST-GENERATION AUDIT — verify your code against these concrete spec requirements:",
    "",
    "HOW TO AUDIT: For each item below, READ the generated component/screen file,",
    "find the code that implements it, and confirm the values match exactly.",
    "If you cannot find the implementation, it is a REAL GAP — fix it.",
    "",
  ];

  // Extract must_handle from contracts
  const manifest = YAML.parse(fsReadFileSync(join(projectDir, "openuispec.yaml"), "utf-8"));
  const contractsDir = resolve(projectDir, manifest.includes?.contracts ?? "./contracts/");

  if (existsSync(contractsDir)) {
    lines.push("## Contract must_handle requirements");
    for (const file of readdirSync(contractsDir).filter(f => f.endsWith(".yaml")).sort()) {
      try {
        const content = YAML.parse(fsReadFileSync(join(contractsDir, file), "utf-8"));
        const contractName = Object.keys(content)[0];
        const contract = content[contractName];
        if (!contract?.variants) continue;

        for (const [variantName, variant] of Object.entries(contract.variants as Record<string, any>)) {
          const mustHandle = variant?.generation?.must_handle;
          if (mustHandle?.length) {
            lines.push(`\n### ${contractName}.${variantName}`);
            for (const item of mustHandle) {
              lines.push(`- [ ] ${item}`);
            }
          }
        }

        // Top-level generation.must_handle
        const topMustHandle = contract?.generation?.must_handle;
        if (topMustHandle?.length) {
          lines.push(`\n### ${contractName} (global)`);
          for (const item of topMustHandle) {
            lines.push(`- [ ] ${item}`);
          }
        }
      } catch { /* skip unparseable files */ }
    }
    lines.push("");
  }

  // Extract screens and their sections
  const screensDir = resolve(projectDir, manifest.includes?.screens ?? "./screens/");
  if (existsSync(screensDir)) {
    lines.push("## Screens — verify all sections exist in generated code");
    for (const file of readdirSync(screensDir).filter(f => f.endsWith(".yaml")).sort()) {
      try {
        const content = YAML.parse(fsReadFileSync(join(screensDir, file), "utf-8"));
        const screenName = Object.keys(content)[0];
        const screen = content[screenName];
        if (screen?.status === "stub") continue;

        const sections: string[] = [];
        const collectSections = (node: any, prefix = "") => {
          if (!node || typeof node !== "object") return;
          if (node.contract) sections.push(`${prefix}${node.contract}${node.variant ? `.${node.variant}` : ""}`);
          if (node.sections) {
            for (const [key, child] of Object.entries(node.sections)) {
              collectSections(child, `${prefix}${key}/`);
            }
          }
          if (node.children && Array.isArray(node.children)) {
            for (const child of node.children) {
              collectSections(child, prefix);
            }
          }
        };
        collectSections(screen?.layout);

        if (sections.length > 0) {
          lines.push(`\n### ${screenName} (${file})`);
          for (const section of sections) {
            lines.push(`- [ ] ${section}`);
          }
        }

        // Adaptive layout
        if (screen?.layout?.adaptive || screen?.adaptive) {
          lines.push(`- [ ] Adaptive breakpoints implemented`);
        }
      } catch { /* skip */ }
    }
    lines.push("");
  }

  // Locale keys count
  const localesDir = resolve(projectDir, manifest.includes?.locales ?? "./locales/");
  if (existsSync(localesDir)) {
    const localeFiles = readdirSync(localesDir).filter(f => f.endsWith(".json"));
    if (localeFiles.length > 0) {
      lines.push("## Locales — verify all locale files are wired");
      for (const file of localeFiles) {
        try {
          const keys = Object.keys(JSON.parse(fsReadFileSync(join(localesDir, file), "utf-8")));
          lines.push(`- [ ] ${file}: ${keys.length} keys loaded at runtime`);
        } catch { /* skip */ }
      }
      lines.push("");
    }
  }

  // Platform-specific checks
  const platformDir = resolve(projectDir, manifest.includes?.platform ?? "./platform/");
  const platformPath = join(platformDir, `${target}.yaml`);
  if (existsSync(platformPath)) {
    try {
      const platformDoc = YAML.parse(fsReadFileSync(platformPath, "utf-8"));
      const platformDef = platformDoc?.[target];
      if (platformDef?.generation) {
        lines.push("## Platform generation requirements");
        const gen = platformDef.generation;
        if (gen.architecture) lines.push(`- [ ] Architecture: ${gen.architecture}`);
        if (gen.naming) lines.push(`- [ ] Naming convention: ${gen.naming}`);
        if (gen.css) lines.push(`- [ ] CSS framework: ${gen.css}`);
      }
    } catch { /* skip */ }
  }

  lines.push("FOR EACH UNCHECKED ITEM: Read the generated file, search for the implementation,");
  lines.push("and either confirm it matches or fix it. Do not mark items as 'intentionally skipped'");
  lines.push("unless the user explicitly requested to skip them.");

  return lines.join("\n");
}

server.registerTool(
  "openuispec_check",
  {
    description: "Run composite validation + post-generation audit. Returns schema validation results AND a concrete audit checklist derived from your spec files — listing every contract must_handle item, every screen section, and every locale file that must exist in your generated code. Verify each item.",
    inputSchema: { target: targetSchema },
  },
  async ({ target }) => {
    try {
      const result = buildCheckResult(target, projectCwd);
      const projectDir = findProjectDir(projectCwd);
      const audit = buildAuditChecklist(projectDir, target);
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
          { type: "text" as const, text: audit },
        ],
      };
    } catch (err) {
      return toolError(err);
    }
  }
);

// ── tool: openuispec_status ──────────────────────────────────────────

server.registerTool(
  "openuispec_status",
  {
    description: "Show cross-target status summary: baseline, drift, and recommended next steps for all configured targets. Good starting point to understand project state.",
  },
  async () => {
    try {
      return toolResult(buildStatusResult(projectCwd));
    } catch (err) {
      return toolError(err);
    }
  }
);

// ── tool: openuispec_validate ────────────────────────────────────────

server.registerTool(
  "openuispec_validate",
  {
    description: "Validate spec files against JSON schemas. Returns validation errors grouped by type (manifest, tokens, screens, flows, platform, locales, contracts, semantic).",
    inputSchema: {
      groups: z
        .array(z.enum(["manifest", "tokens", "screens", "flows", "platform", "locales", "contracts", "semantic"]))
        .optional()
        .describe("Specific groups to validate. If omitted, validates all groups."),
    },
  },
  async ({ groups }) => {
    try {
      return toolResult(buildValidateResult(groups, projectCwd));
    } catch (err) {
      return toolError(err);
    }
  }
);

// ── tool: openuispec_read_specs ───────────────────────────────────────

server.registerTool(
  "openuispec_read_specs",
  {
    description: "Read the full contents of spec files. Call after openuispec_prepare to load the actual YAML/JSON content. Pass specific file paths from the prepare output, or omit to read all spec files. Use these contents as the authoritative source — do NOT paraphrase from memory.",
    inputSchema: {
      paths: z
        .array(z.string())
        .optional()
        .describe("Specific spec file paths to read (relative to spec root, e.g. 'screens/home.yaml'). If omitted, reads all spec files."),
    },
  },
  async ({ paths }) => {
    try {
      const projectDir = findProjectDir(projectCwd);
      const allFiles = discoverSpecFiles(projectDir);
      const filesToRead = paths && paths.length > 0
        ? allFiles.filter((f) => {
            const rel = relative(projectDir, f);
            return paths.some((p) => rel === p || rel.endsWith(p));
          })
        : allFiles;

      const contents = filesToRead.map((f) => ({
        path: relative(projectDir, f),
        content: fsReadFileSync(f, "utf-8"),
      }));

      return toolResult(contents);
    } catch (err) {
      return toolError(err);
    }
  }
);

// ── tool: openuispec_drift ───────────────────────────────────────────

server.registerTool(
  "openuispec_drift",
  {
    description: "Detect spec drift since last snapshot. Shows which spec files changed, were added, or removed. Use explain to see property-level changes.",
    inputSchema: {
      target: targetSchema,
      explain: z.boolean().optional().default(false).describe("Include semantic explanation of changes"),
    },
  },
  async ({ target, explain }) => {
    try {
      const { result } = loadTargetDrift(projectCwd, target, false, explain);
      return toolResult(result);
    } catch (err) {
      return toolError(err);
    }
  }
);

// ── schema type catalog ─────────────────────────────────────────

const SCHEMA_CATALOG: Record<string, { file: string; title: string; description: string }> = {
  manifest:         { file: "openuispec.schema.json",            title: "Root Manifest",    description: "Root manifest (openuispec.yaml): project info, includes, generation targets, data model, API endpoints, formatters, mappers" },
  screen:           { file: "screen.schema.json",                title: "Screen",           description: "Screen composition: layout, sections, navigation, surfaces, data/state bindings, adaptive breakpoints" },
  flow:             { file: "flow.schema.json",                  title: "Flow",             description: "Navigation flow definitions: steps, transitions, guards, and entry points" },
  platform:         { file: "platform.schema.json",              title: "Platform",         description: "Platform-specific generation config: architecture, naming, CSS framework, component mapping" },
  contract:         { file: "contract.schema.json",              title: "Contract",         description: "Built-in UI contract definitions: variants, props, must_handle states, generation hints" },
  "custom-contract":{ file: "custom-contract.schema.json",       title: "Custom Contract",  description: "User-defined UI contract definitions (x_ prefixed)" },
  locale:           { file: "locale.schema.json",                title: "Locale",           description: "Locale translation files: flat key-value string maps" },
  "tokens/color":       { file: "tokens/color.schema.json",       title: "Color Tokens",       description: "Color tokens: brand, surface, text, semantic, border groups with HSL ranges and contrast" },
  "tokens/typography":  { file: "tokens/typography.schema.json",   title: "Typography Tokens",  description: "Typography tokens: font families, sizes, weights, line heights, letter spacing" },
  "tokens/spacing":     { file: "tokens/spacing.schema.json",     title: "Spacing Tokens",     description: "Spacing tokens: named spacing scale values" },
  "tokens/elevation":   { file: "tokens/elevation.schema.json",   title: "Elevation Tokens",   description: "Elevation tokens: shadow definitions per level" },
  "tokens/motion":      { file: "tokens/motion.schema.json",      title: "Motion Tokens",      description: "Motion tokens: animation duration and easing curves" },
  "tokens/layout":      { file: "tokens/layout.schema.json",      title: "Layout Tokens",      description: "Layout tokens: radii, breakpoints, max widths, grid columns" },
  "tokens/themes":      { file: "tokens/themes.schema.json",      title: "Theme Tokens",       description: "Theme definitions: token overrides per theme (e.g. dark mode)" },
  "tokens/icons":       { file: "tokens/icons.schema.json",       title: "Icon Tokens",        description: "Icon tokens: icon set, size scale, default size" },
};

// ── tool: openuispec_spec_types ──────────────────────────────────

server.registerTool(
  "openuispec_spec_types",
  {
    description: "List all available OpenUISpec spec types with brief descriptions. Use this to discover what kinds of spec files can be created and what schema format each one follows. Call openuispec_spec_schema with a specific type to get the full JSON schema.",
  },
  async () => {
    const types = Object.entries(SCHEMA_CATALOG).map(([type, info]) => ({
      type,
      title: info.title,
      description: info.description,
    }));
    return toolResult(types);
  }
);

// ── tool: openuispec_spec_schema ─────────────────────────────────

server.registerTool(
  "openuispec_spec_schema",
  {
    description: "Get the full JSON schema for a specific OpenUISpec spec type. Returns the complete schema definition so you know the exact format when creating or editing spec files. Call openuispec_spec_types first to see available types.",
    inputSchema: {
      type: z.string().describe("Spec type to get schema for (e.g. 'screen', 'tokens/color', 'contract'). Use openuispec_spec_types to list all available types."),
    },
  },
  async ({ type }) => {
    const entry = SCHEMA_CATALOG[type];
    if (!entry) {
      return toolError(`Unknown spec type "${type}". Call openuispec_spec_types to see available types.`);
    }
    try {
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const schemaPath = join(__dirname, "..", "schema", entry.file);
      const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
      return toolResult({ type, title: entry.title, schema });
    } catch (err) {
      return toolError(err);
    }
  }
);

// ── start server ─────────────────────────────────────────────────────

export async function startMcpServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Direct execution (npx openuispec-mcp)
const isDirectRun =
  process.argv[1]?.endsWith("mcp-server/index.ts") ||
  process.argv[1]?.endsWith("mcp-server/index.js");

if (isDirectRun) {
  startMcpServer().catch((err) => {
    console.error("Failed to start OpenUISpec MCP server:", err);
    process.exit(1);
  });
}
