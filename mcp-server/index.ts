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
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SUPPORTED_TARGETS, findProjectDir, discoverSpecFiles, readProjectName, resolveOutputDir, stateFilePath, loadTargetDrift, createSnapshot } from "../drift/index.js";
import { buildPrepareResult } from "../prepare/index.js";
import { buildCheckResult } from "../check/index.js";
import { buildStatusResult } from "../status/index.js";
import { buildValidateResult } from "../schema/validate.js";
import YAML from "yaml";
import { takeScreenshot, takeScreenshotBatch } from "./screenshot.js";
import { takeAndroidScreenshot, takeAndroidScreenshotBatch } from "./screenshot-android.js";
import { takeIOSScreenshot, takeIOSScreenshotBatch } from "./screenshot-ios.js";
import { renderPreview } from "./preview.js";

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

// ── spec directory resolver ─────────────────────────────────────────

function resolveSpecDir(projectDir: string, manifest: any, key: string): string {
  return resolve(projectDir, manifest.includes?.[key] ?? `./${key}/`);
}

// ── shared tool helpers ──────────────────────────────────────────────

const targetSchema = z.enum(SUPPORTED_TARGETS).describe("Target platform");

function formatError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function toolResult(data: unknown, hint?: string): { content: { type: "text"; text: string }[] } {
  const parts: { type: "text"; text: string }[] = [
    { type: "text" as const, text: JSON.stringify(data) },
  ];
  if (hint) {
    parts.push({ type: "text" as const, text: hint });
  }
  return { content: parts };
}

function toolError(err: unknown): { content: [{ type: "text"; text: string }]; isError: true } {
  return { content: [{ type: "text" as const, text: `Error: ${formatError(err)}` }], isError: true };
}

function formatAuditValue(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function collectStateRoleAuditItems(node: unknown, prefix = ""): string[] {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    return [];
  }

  const items: string[] = [];
  const record = node as Record<string, unknown>;

  const states = record.states;
  if (states && typeof states === "object" && !Array.isArray(states)) {
    for (const [stateName, roles] of Object.entries(states as Record<string, unknown>)) {
      if (!roles || typeof roles !== "object" || Array.isArray(roles)) continue;
      for (const [roleName, roleValue] of Object.entries(roles as Record<string, unknown>)) {
        const statePath = prefix ? `${prefix}.states.${stateName}.${roleName}` : `states.${stateName}.${roleName}`;
        items.push(`${statePath} = ${formatAuditValue(roleValue)}`);
      }
    }
  }

  for (const [key, value] of Object.entries(record)) {
    if (key === "states" || !value || typeof value !== "object" || Array.isArray(value)) continue;
    const childPrefix = prefix ? `${prefix}.${key}` : key;
    items.push(...collectStateRoleAuditItems(value, childPrefix));
  }

  return items;
}

// ── create server ────────────────────────────────────────────────────

export const server = new McpServer(
  {
    name: "openuispec",
    version: getPackageVersion(),
  },
  {
    instructions: `OpenUISpec — semantic UI spec format. Spec files (YAML) are the single source of truth for all UI.

WORKFLOW — each tool response includes a next_tool hint, follow it:
1. openuispec_prepare(target) → get context + platform config (include_specs=true to embed content)
2. openuispec_read_specs(paths) → load spec content (omit paths for listing only)
3. Generate/update code
4. openuispec_check(target) → validate spec files (audit=true for review checklist, not code inspection)
5. Remind the user to baseline when satisfied: openuispec drift --snapshot --target <t>
   Do not baseline on your own initiative — the user decides when output is accepted.

FOCUSED GETTERS (prefer for incremental edits): get_screen, get_contract, get_component, get_tokens, get_locale
SPEC AUTHORING: spec_types → spec_schema(type, summary?) → write YAML
PREVIEW: openuispec_preview(screen) → render spec as HTML with mock data, returns screenshot (no app needed)
SCREENSHOTS: screenshot (web), screenshot_android, screenshot_ios — single + batch variants

Skip only for purely non-UI requests.

When generating UI code:
1. Check anti_patterns in the prepare result — hard constraints on what NOT to produce
2. Check design_context — match the complexity level and personality description
3. Apply the AI Fingerprint Test: would a viewer immediately say "AI made this"? If yes, revise.`,
  }
);

// ── tool: openuispec_prepare ─────────────────────────────────────────

server.registerTool(
  "openuispec_prepare",
  {
    description: "Build AI-ready work bundle for a target platform. REQUIRED before any UI code generation. Returns spec context, platform config, semantic changes, and generation constraints.",
    inputSchema: {
      target: targetSchema,
      include_specs: z.boolean().optional().default(false).describe("Embed all spec file contents in the response. Saves a separate read_specs call but increases response size."),
    },
  },
  async ({ target, include_specs }) => {
    try {
      const result = buildPrepareResult(target, projectCwd, include_specs);
      const baselinePending = result.baseline_status?.output_exists && !result.baseline_status?.snapshot_exists;
      const baselineReminder = baselinePending
        ? " ⚠ Baseline pending — remind user to run `openuispec drift --snapshot --target " + target + "` when satisfied."
        : "";
      const sharedHint = result.shared_layers?.length
        ? ` ℹ ${result.shared_layers.length} shared layer(s) detected — check shared_layers for generation guidance.`
        : "";
      const hint = (include_specs
        ? "next_tool: openuispec_check (after generating code)"
        : "next_tool: openuispec_read_specs (load spec contents for generation)") + baselineReminder + sharedHint;
      return toolResult(result, hint);
    } catch (err) {
      return toolError(err);
    }
  }
);

// ── tool: openuispec_check ───────────────────────────────────────────

function buildAuditChecklist(projectDir: string, target: string, screenFilter?: string[], contractFilter?: string[]): string {
  const lines: string[] = [
    "SPEC-DERIVED CHECKLIST — this is extracted from the spec files, NOT from generated code.",
    "Use it as a guide when you manually review the generated code.",
    "",
    "For each item below, read the generated component/screen file,",
    "find the code that implements it, and confirm the values match.",
    "If you cannot find the implementation, it is a gap — fix it.",
    "",
  ];

  // Extract must_handle from contracts
  const manifest = YAML.parse(readFileSync(join(projectDir, "openuispec.yaml"), "utf-8"));
  const contractsDir = resolveSpecDir(projectDir, manifest, "contracts");

  if (existsSync(contractsDir)) {
    lines.push("## Contract must_handle requirements");
    for (const file of readdirSync(contractsDir).filter(f => f.endsWith(".yaml")).sort()) {
      try {
        const content = YAML.parse(readFileSync(join(contractsDir, file), "utf-8"));
        const contractName = Object.keys(content)[0];
        if (contractFilter && !contractFilter.includes(contractName)) continue;
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

          const stateRoleItems = collectStateRoleAuditItems(variant?.tokens);
          if (stateRoleItems.length) {
            if (!mustHandle?.length) {
              lines.push(`\n### ${contractName}.${variantName}`);
            }
            lines.push(`- [ ] Explicit state-role tokens are implemented for ${contractName}.${variantName}`);
            for (const item of stateRoleItems) {
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

        const topLevelStateRoleItems = collectStateRoleAuditItems(contract?.tokens);
        if (topLevelStateRoleItems.length) {
          lines.push(`\n### ${contractName} (state-role tokens)`);
          for (const item of topLevelStateRoleItems) {
            lines.push(`- [ ] ${item}`);
          }
        }
      } catch { /* skip unparseable files */ }
    }
    lines.push("");
  }

  // Extract screens and their sections
  const screensDir = resolveSpecDir(projectDir, manifest, "screens");
  if (existsSync(screensDir)) {
    lines.push("## Screens — verify all sections exist in generated code");
    for (const file of readdirSync(screensDir).filter(f => f.endsWith(".yaml")).sort()) {
      try {
        const content = YAML.parse(readFileSync(join(screensDir, file), "utf-8"));
        const screenName = Object.keys(content)[0];
        if (screenFilter && !screenFilter.includes(screenName)) continue;
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
  const localesDir = resolveSpecDir(projectDir, manifest, "locales");
  if (existsSync(localesDir)) {
    const localeFiles = readdirSync(localesDir).filter(f => f.endsWith(".json"));
    if (localeFiles.length > 0) {
      lines.push("## Locales — verify all locale files are wired");
      for (const file of localeFiles) {
        try {
          const keys = Object.keys(JSON.parse(readFileSync(join(localesDir, file), "utf-8")));
          lines.push(`- [ ] ${file}: ${keys.length} keys loaded at runtime`);
        } catch { /* skip */ }
      }
      lines.push("");
    }
  }

  // Platform-specific checks
  const platformDir = resolveSpecDir(projectDir, manifest, "platform");
  const platformPath = join(platformDir, `${target}.yaml`);
  if (existsSync(platformPath)) {
    try {
      const platformDoc = YAML.parse(readFileSync(platformPath, "utf-8"));
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
    description: "Validate spec files (schema + semantic lint) and check prepare readiness. Does NOT inspect generated code. With audit=true, returns a spec-derived checklist of must_handle items, must_avoid anti-patterns, screen sections, and locale files — use it as a guide when YOU manually review the generated code. design_quality_score and audit_findings are included when audit=true.",
    inputSchema: {
      target: targetSchema,
      audit: z.boolean().optional().default(false).describe("Include the full audit checklist. Omit for a compact pass/fail summary."),
      screens: z.array(z.string()).optional().describe("Screen names to audit (e.g. ['home_feed']). Requires audit=true."),
      contracts: z.array(z.string()).optional().describe("Contract names to audit (e.g. ['action_trigger']). Requires audit=true."),
    },
  },
  async ({ target, audit: includeAudit, screens, contracts }) => {
    try {
      const result = buildCheckResult(target, projectCwd, includeAudit);
      const totalErrors = result.validation.total_errors + result.semantic.total_errors;
      const passing = totalErrors === 0 && result.prepare.ready;

      // bootstrap mode = no snapshot exists yet
      const baselineHint = result.prepare.mode === "bootstrap"
        ? `⚠ BASELINE PENDING: Remind the user to run \`openuispec drift --snapshot --target ${target}\` when satisfied with the output.`
        : "";

      if (passing && !includeAudit) {
        const compact = {
          target,
          status: "PASS",
          validation_errors: 0,
          semantic_errors: 0,
          prepare: { mode: result.prepare.mode, ready: true },
        };
        return toolResult(compact, baselineHint || `Remind the user to baseline: openuispec drift --snapshot --target ${target}`);
      }

      const projectDir = findProjectDir(projectCwd);
      const hints: string[] = [JSON.stringify(result)];

      if (includeAudit) {
        const screenFilter = screens && screens.length > 0 ? screens : undefined;
        const contractFilter = contracts && contracts.length > 0 ? contracts : undefined;
        hints.push(buildAuditChecklist(projectDir, target, screenFilter, contractFilter));
      }

      if (includeAudit && result.audit) {
        hints.push(`DESIGN QUALITY SCORE: ${result.audit.score}/100 (${result.audit.errors} errors, ${result.audit.warnings} warnings)`);
        if (!result.audit.passed && result.audit.threshold > 0) {
          hints.push(`SCORE BELOW THRESHOLD: ${result.audit.score} < ${result.audit.threshold}`);
        }
      }

      if (baselineHint) hints.push(baselineHint);
      hints.push(passing ? "next_tool: openuispec_drift --snapshot (to create/update baseline)" : "Fix validation errors, then re-run openuispec_check.");

      return { content: hints.map(text => ({ type: "text" as const, text })) };
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
      return toolResult(buildStatusResult(projectCwd), "next_tool: openuispec_prepare for any target that is 'behind' or 'needs generation'");
    } catch (err) {
      return toolError(err);
    }
  }
);

// ── tool: openuispec_validate ────────────────────────────────────────

server.registerTool(
  "openuispec_validate",
  {
    description: "Validate spec files against JSON schemas. Returns validation errors grouped by type (manifest, tokens, screens, flows, platform, locales, contracts, components, semantic).",
    inputSchema: {
      groups: z
        .array(z.enum(["manifest", "tokens", "screens", "flows", "platform", "locales", "contracts", "components", "semantic"]))
        .optional()
        .describe("Specific groups to validate. If omitted, validates all groups."),
    },
  },
  async ({ groups }) => {
    try {
      const result = buildValidateResult(groups, projectCwd);
      return toolResult(result, "next_tool: openuispec_check (for full validation + prepare readiness)");
    } catch (err) {
      return toolError(err);
    }
  }
);

// ── tool: openuispec_read_specs ───────────────────────────────────────

server.registerTool(
  "openuispec_read_specs",
  {
    description: "Read spec file contents. Pass specific paths to load those files. If no paths given, returns a listing of all spec files (path + category, no content) — use that to pick which files to load.",
    inputSchema: {
      paths: z
        .array(z.string())
        .optional()
        .describe("Spec file paths to read (relative, e.g. 'screens/home.yaml'). If omitted, returns listing only."),
    },
  },
  async ({ paths }) => {
    try {
      const projectDir = findProjectDir(projectCwd);
      const allFiles = discoverSpecFiles(projectDir);

      if (!paths || paths.length === 0) {
        // Listing mode — paths + categories, no content
        const listing = allFiles.map((f) => {
          const rel = relative(projectDir, f);
          const dir = dirname(rel);
          const category = rel === "openuispec.yaml" ? "manifest" : (dir || "other");
          return { path: rel, category };
        });
        return toolResult(listing, "next_tool: openuispec_read_specs with specific paths to load content");
      }

      const filesToRead = allFiles.filter((f) => {
        const rel = relative(projectDir, f);
        return paths.some((p) => rel === p || rel.endsWith(p));
      });

      const contents = filesToRead.map((f) => ({
        path: relative(projectDir, f),
        content: readFileSync(f, "utf-8"),
      }));

      return toolResult(contents, "next_tool: generate/update code, then openuispec_check");
    } catch (err) {
      return toolError(err);
    }
  }
);

// ── tool: openuispec_drift ───────────────────────────────────────────

server.registerTool(
  "openuispec_drift",
  {
    description: "Detect spec drift since last snapshot, or create a new snapshot. Shows which spec files changed, were added, or removed. Use explain for property-level changes. Use snapshot=true after generation to create/update the baseline.",
    inputSchema: {
      target: targetSchema,
      explain: z.boolean().optional().default(false).describe("Include semantic explanation of changes"),
      snapshot: z.boolean().optional().default(false).describe("Create a new snapshot (baseline) instead of checking drift. Use after code generation is complete and verified."),
    },
  },
  async ({ target, explain, snapshot: doSnapshot }) => {
    try {
      if (doSnapshot) {
        const result = createSnapshot(projectCwd, target);
        return toolResult(result, "Baseline created. next_tool: openuispec_status (to verify all targets)");
      }
      const { result } = loadTargetDrift(projectCwd, target, false, explain);
      const d = result.drift;
      const hasDrift = d.changed.length > 0 || d.added.length > 0 || d.removed.length > 0;
      const hint = hasDrift
        ? "next_tool: openuispec_prepare (to build work bundle for pending changes)"
        : "No drift detected. Target is up to date.";
      return toolResult(result, hint);
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
  component:        { file: "component.schema.json",             title: "Component",        description: "Reusable composition of contracts with named slots, states, variants, and layout" },
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
    return toolResult(types, "next_tool: openuispec_spec_schema(type) for the full schema of a specific type");
  }
);

// ── tool: openuispec_spec_schema ─────────────────────────────────

server.registerTool(
  "openuispec_spec_schema",
  {
    description: "Get the JSON schema for a specific OpenUISpec spec type. Returns the complete schema definition so you know the exact format when creating or editing spec files.",
    inputSchema: {
      type: z.string().describe("Spec type (e.g. 'screen', 'tokens/color', 'contract'). Use openuispec_spec_types to list all."),
      summary: z.boolean().optional().default(false).describe("Return only top-level property names and types instead of the full schema. Useful for a quick overview."),
    },
  },
  async ({ type, summary }) => {
    const entry = SCHEMA_CATALOG[type];
    if (!entry) {
      return toolError(`Unknown spec type "${type}". Call openuispec_spec_types to see available types.`);
    }
    try {
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const schemaPath = join(__dirname, "..", "schema", entry.file);
      const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));

      if (summary) {
        // Extract top-level properties summary
        const props = schema.properties ?? schema.patternProperties ?? {};
        const topLevel: Record<string, string> = {};
        for (const [key, val] of Object.entries(props)) {
          const v = val as any;
          topLevel[key] = v.type ?? (v.$ref ? `ref:${v.$ref}` : "object");
        }
        return toolResult({ type, title: entry.title, required: schema.required ?? [], properties: topLevel },
          "Use summary=false for the full schema when creating/editing spec files.");
      }

      return toolResult({ type, title: entry.title, schema });
    } catch (err) {
      return toolError(err);
    }
  }
);

// ── tool: openuispec_get_screen ──────────────────────────────────────

server.registerTool(
  "openuispec_get_screen",
  {
    description: "Get the parsed content of a single screen spec file. Faster than read_specs when you only need one screen.",
    inputSchema: {
      name: z.string().describe("Screen name, e.g. 'home_feed' (matches filename without .yaml)"),
    },
  },
  async ({ name }) => {
    try {
      const projectDir = findProjectDir(projectCwd);
      const manifest = YAML.parse(readFileSync(join(projectDir, "openuispec.yaml"), "utf-8"));
      const screensDir = resolveSpecDir(projectDir, manifest, "screens");
      const filePath = join(screensDir, `${name}.yaml`);
      if (!existsSync(filePath)) {
        return toolError(`Screen "${name}" not found. Expected file: ${filePath}`);
      }
      const content = readFileSync(filePath, "utf-8");
      return toolResult({ name, path: relative(projectDir, filePath), content });
    } catch (err) {
      return toolError(err);
    }
  }
);

// ── tool: openuispec_get_contract ───────────────────────────────────

server.registerTool(
  "openuispec_get_contract",
  {
    description: "Get a single contract spec, optionally filtered to one variant. Faster than read_specs when you only need one contract.",
    inputSchema: {
      name: z.string().describe("Contract name, e.g. 'action_trigger'"),
      variant: z.string().optional().describe("Optional variant name, e.g. 'fab'. If given, returns only that variant's definition."),
    },
  },
  async ({ name, variant }) => {
    try {
      const projectDir = findProjectDir(projectCwd);
      const manifest = YAML.parse(readFileSync(join(projectDir, "openuispec.yaml"), "utf-8"));
      const contractsDir = resolveSpecDir(projectDir, manifest, "contracts");

      if (!existsSync(contractsDir)) {
        return toolError(`Contracts directory not found: ${contractsDir}`);
      }

      // Scan contract files for the matching contract key
      for (const file of readdirSync(contractsDir).filter(f => f.endsWith(".yaml")).sort()) {
        const filePath = join(contractsDir, file);
        const raw = readFileSync(filePath, "utf-8");
        const content = YAML.parse(raw);
        const contractName = Object.keys(content)[0];
        if (contractName !== name) continue;

        if (variant) {
          const contract = content[contractName];
          const variantDef = contract?.variants?.[variant];
          if (!variantDef) {
            return toolError(`Variant "${variant}" not found in contract "${name}". Available variants: ${Object.keys(contract?.variants ?? {}).join(", ")}`);
          }
          return toolResult({ name, variant, definition: variantDef });
        }

        return toolResult({ name, path: relative(projectDir, filePath), content: raw });
      }

      return toolError(`Contract "${name}" not found in ${contractsDir}`);
    } catch (err) {
      return toolError(err);
    }
  }
);

// ── tool: openuispec_get_component ──────────────────────────────────

server.registerTool(
  "openuispec_get_component",
  {
    description: "Get a single component spec. Components are reusable compositions of contracts with named slots.",
    inputSchema: {
      name: z.string().describe("Component name, e.g. 'media_player'"),
      variant: z.string().optional().describe("Optional variant name. If given, returns only that variant's definition."),
    },
  },
  async ({ name, variant }) => {
    try {
      const projectDir = findProjectDir(projectCwd);
      const manifest = YAML.parse(readFileSync(join(projectDir, "openuispec.yaml"), "utf-8"));
      const componentsDir = resolveSpecDir(projectDir, manifest, "components");

      if (!existsSync(componentsDir)) {
        return toolError(`Components directory not found: ${componentsDir}`);
      }

      for (const file of readdirSync(componentsDir).filter(f => f.endsWith(".yaml")).sort()) {
        const filePath = join(componentsDir, file);
        const raw = readFileSync(filePath, "utf-8");
        const content = YAML.parse(raw);
        const componentName = Object.keys(content)[0];
        if (componentName !== name) continue;

        if (variant) {
          const component = content[componentName];
          const variantDef = component?.variants?.[variant];
          if (!variantDef) {
            return toolError(`Variant "${variant}" not found in component "${name}". Available variants: ${Object.keys(component?.variants ?? {}).join(", ")}`);
          }
          return toolResult({ name, variant, definition: variantDef });
        }

        return toolResult({ name, path: relative(projectDir, filePath), content: raw });
      }

      return toolError(`Component "${name}" not found in ${componentsDir}`);
    } catch (err) {
      return toolError(err);
    }
  }
);

// ── tool: openuispec_get_tokens ─────────────────────────────────────

server.registerTool(
  "openuispec_get_tokens",
  {
    description: "Get tokens for a specific category (color, typography, spacing, elevation, motion, layout, themes, icons). Faster than read_specs when you only need one token file.",
    inputSchema: {
      category: z.string().describe("Token category, e.g. 'color', 'typography', 'spacing', 'elevation', 'motion', 'layout', 'themes', 'icons'"),
    },
  },
  async ({ category }) => {
    try {
      const projectDir = findProjectDir(projectCwd);
      const manifest = YAML.parse(readFileSync(join(projectDir, "openuispec.yaml"), "utf-8"));
      const tokensDir = resolveSpecDir(projectDir, manifest, "tokens");

      if (!existsSync(tokensDir)) {
        return toolError(`Tokens directory not found: ${tokensDir}`);
      }

      // Try exact match first, then scan for files containing the category name
      const candidates = [
        `${category}.yaml`,
        `${category}.yml`,
      ];

      for (const candidate of candidates) {
        const filePath = join(tokensDir, candidate);
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, "utf-8");
          return toolResult({ category, path: relative(projectDir, filePath), content });
        }
      }

      // List available token files for helpful error
      const available = readdirSync(tokensDir)
        .filter(f => f.endsWith(".yaml") || f.endsWith(".yml"))
        .map(f => f.replace(/\.ya?ml$/, ""));
      return toolError(`Token category "${category}" not found. Available: ${available.join(", ")}`);
    } catch (err) {
      return toolError(err);
    }
  }
);

// ── locale key lookup (supports both flat dotted keys and nested objects) ──

function lookupLocaleKey(content: Record<string, unknown>, key: string): { found: boolean; value: unknown } {
  // 1. Try flat (literal) key first: { "nav.tasks": "Tasks" }
  if (key in content) {
    return { found: true, value: content[key] };
  }
  // 2. Try nested path: { nav: { tasks: "Tasks" } }
  const parts = key.split(".");
  let current: unknown = content;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object" || Array.isArray(current)) {
      return { found: false, value: undefined };
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current !== undefined ? { found: true, value: current } : { found: false, value: undefined };
}

// ── tool: openuispec_get_locale ─────────────────────────────────────

server.registerTool(
  "openuispec_get_locale",
  {
    description: "Get a single locale file, optionally filtered to specific keys. Faster than read_specs when you only need one locale or specific translation keys.",
    inputSchema: {
      locale: z.string().describe("Locale code, e.g. 'en', 'ru'"),
      keys: z.array(z.string()).optional().describe("Optional list of keys to filter to, e.g. ['nav.home', 'nav.create']. If omitted, returns the full locale file."),
    },
  },
  async ({ locale, keys }) => {
    try {
      const projectDir = findProjectDir(projectCwd);
      const manifest = YAML.parse(readFileSync(join(projectDir, "openuispec.yaml"), "utf-8"));
      const localesDir = resolveSpecDir(projectDir, manifest, "locales");
      const filePath = join(localesDir, `${locale}.json`);

      if (!existsSync(filePath)) {
        if (existsSync(localesDir)) {
          const available = readdirSync(localesDir)
            .filter(f => f.endsWith(".json"))
            .map(f => f.replace(/\.json$/, ""));
          return toolError(`Locale "${locale}" not found. Available: ${available.join(", ")}`);
        }
        return toolError(`Locales directory not found: ${localesDir}`);
      }

      const raw = readFileSync(filePath, "utf-8");
      const content = JSON.parse(raw);

      if (keys && keys.length > 0) {
        const filtered: Record<string, unknown> = {};
        for (const key of keys) {
          const { found, value } = lookupLocaleKey(content, key);
          if (found) filtered[key] = value;
        }
        return toolResult({ locale, path: relative(projectDir, filePath), content: filtered });
      }

      return toolResult({ locale, path: relative(projectDir, filePath), content });
    } catch (err) {
      return toolError(err);
    }
  }
);

// ── tool: openuispec_screenshot ──────────────────────────────────────

server.registerTool(
  "openuispec_screenshot",
  {
    description: "Take a screenshot of the generated web app at a specific route. Starts the Vite dev server automatically if needed (first call may take longer). Returns a PNG image for visual verification of generated UI. Requires puppeteer to be installed (npm install -g puppeteer).",
    inputSchema: {
      route: z.string().default("/").describe("Route path to navigate to, e.g. '/home', '/settings', '/posts/123'"),
      viewport: z.object({
        width: z.number().default(1280),
        height: z.number().default(800),
      }).optional().describe("Viewport dimensions. Defaults to 1280x800. Use {width: 375, height: 812} for mobile."),
      scale: z.number().optional().default(2).describe("Device pixel ratio used for capture. Higher values produce sharper screenshots (default 2)."),
      theme: z.enum(["light", "dark"]).optional().describe("Force a color scheme via prefers-color-scheme emulation"),
      wait_for: z.number().optional().default(1000).describe("Milliseconds to wait after page load before screenshotting (default 1000)"),
      full_page: z.boolean().optional().default(false).describe("Capture the full scrollable page instead of just the viewport"),
      selector: z.string().optional().describe("CSS selector to screenshot a specific element instead of the full page"),
      output_dir: z.string().optional().describe("Directory to save the screenshot PNG (relative to web app root). E.g. 'screenshots'. If omitted, only returns base64 in response."),
      init_script: z.string().optional().describe("JavaScript to run before the page renders. Passed to the app via ?__ous_init=<base64> query param. The app's bootstrapper decodes and executes it — use for auth injection, role switching, or session setup."),
    },
  },
  async ({ route, viewport, scale, theme, wait_for, full_page, selector, output_dir, init_script }) => {
    try {
      return await takeScreenshot(projectCwd, {
        route,
        viewport,
        scale,
        theme,
        wait_for,
        full_page,
        selector,
        output_dir,
        init_script,
      });
    } catch (err) {
      return toolError(err);
    }
  }
);

// ── tool: openuispec_screenshot_android ───────────────────────────────

server.registerTool(
  "openuispec_screenshot_android",
  {
    description: "Take a screenshot of an Android app on an emulator. Builds the APK, installs it, launches the app, and captures via adb screencap. Shows the real app with navigation, images, and themes. Requires a running Android emulator. Works with any Android project — use project_dir to point directly at a project, or uses OpenUISpec manifest discovery if available.",
    inputSchema: {
      screen: z.string().optional().describe("Screen name for metadata and filename (e.g. 'home_feed')."),
      route: z.string().optional().describe("Deep link URI to navigate to a specific screen (e.g. 'myapp://profile/123'). If omitted, launches the main activity."),
      nav: z.array(z.string()).optional().describe("UI navigation steps — tap elements by visible text in order (e.g. ['Profile', 'Settings']). Executed after the app launches and loads."),
      theme: z.enum(["light", "dark"]).optional().describe("Force light or dark mode via system UI mode"),
      wait_for: z.number().optional().default(3000).describe("Milliseconds to wait after launch for content to load (default 3000)"),
      output_dir: z.string().optional().describe("Directory to save the screenshot PNG (relative to Android project root). E.g. 'screenshots'. If omitted, only returns base64 in response."),
      project_dir: z.string().optional().describe("Direct path to the Android project root (containing gradlew). Skips OpenUISpec manifest lookup. Use this for standalone Android projects."),
      module: z.string().optional().describe("App module name (e.g. 'app', 'mobile'). If omitted, auto-detects by scanning settings.gradle for the module with com.android.application plugin."),
    },
  },
  async ({ screen, route, nav, theme, wait_for, output_dir, project_dir, module }) => {
    try {
      return await takeAndroidScreenshot(projectCwd, { screen, route, nav, theme, wait_for, output_dir, project_dir, module });
    } catch (err) {
      return toolError(err);
    }
  }
);

// ── tool: openuispec_screenshot_ios ───────────────────────────────────

server.registerTool(
  "openuispec_screenshot_ios",
  {
    description: "Take a screenshot of an iOS app on a Simulator. Builds with xcodebuild, installs on simulator, launches the app, and captures via xcrun simctl. Shows the real app with navigation, images, and themes. Requires Xcode. Works with any iOS project — use project_dir to point directly at a project, or uses OpenUISpec manifest discovery if available.",
    inputSchema: {
      screen: z.string().optional().describe("Screen name for metadata and filename (e.g. 'settings')."),
      device: z.string().optional().describe("Simulator device name (e.g. 'iPhone 15', 'iPad Pro 11-inch (M4)'). If omitted, uses any booted iPhone or the first available one."),
      nav: z.array(z.string()).optional().describe("UI navigation steps — tap elements by visible text in order (e.g. ['Profile', 'Settings']). Executed after the app launches and loads."),
      theme: z.enum(["light", "dark"]).optional().describe("Force light or dark appearance on the simulator"),
      wait_for: z.number().optional().default(3000).describe("Milliseconds to wait after launch for content to load (default 3000)"),
      output_dir: z.string().optional().describe("Directory to save the screenshot PNG (relative to iOS project root). E.g. 'screenshots'. If omitted, only returns base64 in response."),
      project_dir: z.string().optional().describe("Direct path to the iOS project root (containing .xcodeproj/.xcworkspace). Skips OpenUISpec manifest lookup. Use this for standalone iOS projects."),
      scheme: z.string().optional().describe("Xcode scheme name to build. If omitted, auto-detects from xcshareddata/xcschemes or uses the project name."),
      bundle_id: z.string().optional().describe("App bundle identifier (e.g. 'com.example.myapp'). If omitted, auto-detects from project.pbxproj."),
    },
  },
  async ({ screen, device, nav, theme, wait_for, output_dir, project_dir, scheme, bundle_id }) => {
    try {
      return await takeIOSScreenshot(projectCwd, { screen, device, nav, theme, wait_for, output_dir, project_dir, scheme, bundle_id });
    } catch (err) {
      return toolError(err);
    }
  }
);

// ── tool: openuispec_screenshot_web_batch ──────────────────────────────

const webBatchCaptureSchema = z.object({
  screen: z.string().describe("Screen name for metadata and filename"),
  route: z.string().describe("Route path (e.g. '/home', '/settings')"),
  selector: z.string().optional().describe("CSS selector to screenshot a specific element"),
  full_page: z.boolean().optional().describe("Capture full scrollable page"),
  wait_for: z.number().optional().describe("Per-capture wait time in ms"),
  init_script: z.string().optional().describe("Per-capture init script (overrides shared init_script for this capture)"),
});

server.registerTool(
  "openuispec_screenshot_web_batch",
  {
    description: "Take multiple web screenshots in a single server session. Starts the dev server once, then captures all routes in sequence. Much faster than calling screenshot for each route individually.",
    inputSchema: {
      captures: z.array(webBatchCaptureSchema).describe("Array of captures — each with screen name and route"),
      viewport: z.object({ width: z.number().default(1280), height: z.number().default(800) }).optional().describe("Viewport dimensions for all captures"),
      scale: z.number().optional().default(2).describe("Device pixel ratio for all captures (default 2)"),
      theme: z.enum(["light", "dark"]).optional().describe("Force color scheme for all captures"),
      output_dir: z.string().optional().describe("Directory to save all PNGs (relative to web app root)"),
      init_script: z.string().optional().describe("Shared init script for all captures. Passed via ?__ous_init=<base64>. Per-capture init_script overrides this."),
    },
  },
  async ({ captures, viewport, scale, theme, output_dir, init_script }) => {
    try {
      return await takeScreenshotBatch(projectCwd, { captures, viewport, scale, theme, output_dir, init_script });
    } catch (err) {
      return toolError(err);
    }
  }
);

// ── tool: openuispec_screenshot_android_batch ─────────────────────────

const androidBatchCaptureSchema = z.object({
  screen: z.string().describe("Screen name for metadata and filename"),
  route: z.string().optional().describe("Deep link URI to launch"),
  nav: z.array(z.string()).optional().describe("UI tap steps after launch"),
  wait_for: z.number().optional().describe("Per-capture wait time in ms"),
});

server.registerTool(
  "openuispec_screenshot_android_batch",
  {
    description: "Take multiple Android screenshots in a single build+install cycle. Builds the APK once, installs once, then captures each screen in sequence via deep links or UI navigation. Much faster than calling screenshot_android for each screen individually.",
    inputSchema: {
      captures: z.array(androidBatchCaptureSchema).describe("Array of captures — each with screen name and optional route/nav"),
      theme: z.enum(["light", "dark"]).optional().describe("Force light or dark mode for all captures"),
      output_dir: z.string().optional().describe("Directory to save all PNGs (relative to Android project root)"),
      project_dir: z.string().optional().describe("Direct path to Android project root"),
      module: z.string().optional().describe("App module name (default: auto-detect)"),
    },
  },
  async ({ captures, theme, output_dir, project_dir, module }) => {
    try {
      return await takeAndroidScreenshotBatch(projectCwd, { captures, theme, output_dir, project_dir, module });
    } catch (err) {
      return toolError(err);
    }
  }
);

// ── tool: openuispec_screenshot_ios_batch ──────────────────────────────

const iosBatchCaptureSchema = z.object({
  screen: z.string().describe("Screen name for metadata and filename"),
  nav: z.array(z.string()).optional().describe("UI tap steps after launch"),
  wait_for: z.number().optional().describe("Per-capture wait time in ms"),
});

server.registerTool(
  "openuispec_screenshot_ios_batch",
  {
    description: "Take multiple iOS screenshots in a single build+install cycle. Builds the app once, then captures each screen — no-nav screens via simctl, nav screens batched into a single XCUITest run. Much faster than calling screenshot_ios for each screen individually.",
    inputSchema: {
      captures: z.array(iosBatchCaptureSchema).describe("Array of captures — each with screen name and optional nav steps"),
      device: z.string().optional().describe("Simulator device name"),
      theme: z.enum(["light", "dark"]).optional().describe("Force light or dark appearance for all captures"),
      output_dir: z.string().optional().describe("Directory to save all PNGs (relative to iOS project root)"),
      project_dir: z.string().optional().describe("Direct path to iOS project root"),
      scheme: z.string().optional().describe("Xcode scheme name"),
      bundle_id: z.string().optional().describe("App bundle identifier"),
    },
  },
  async ({ captures, device, theme, output_dir, project_dir, scheme, bundle_id }) => {
    try {
      return await takeIOSScreenshotBatch(projectCwd, { captures, device, theme, output_dir, project_dir, scheme, bundle_id });
    } catch (err) {
      return toolError(err);
    }
  }
);

// ── tool: openuispec_preview ────────────────────────────────────────────

server.registerTool(
  "openuispec_preview",
  {
    description: "Render a screen spec as an HTML preview with mock data and return a screenshot. Uses token values, locale strings, and contract-to-HTML mapping to produce a visual approximation without generating a full app. Mock data should be placed in openuispec/mock/<screen>.yaml.",
    inputSchema: {
      screen: z.string().describe("Screen name (e.g. 'home', 'settings', 'task_detail')"),
      size_class: z.enum(["compact", "regular", "expanded"]).optional().default("compact").describe("Adaptive size class — compact (phone), regular (tablet), expanded (desktop)"),
      theme: z.enum(["light", "dark"]).optional().default("light").describe("Color theme"),
      locale: z.string().optional().default("en").describe("Locale code for i18n strings"),
      viewport: z.object({
        width: z.number(),
        height: z.number(),
      }).optional().describe("Custom viewport size (overrides size_class default)"),
      include_html: z.boolean().optional().default(false).describe("Also return the rendered HTML string in the response"),
    },
  },
  async ({ screen, size_class, theme, locale, viewport, include_html }) => {
    try {
      return await renderPreview(projectCwd, { screen, size_class, theme, locale, viewport, include_html });
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
