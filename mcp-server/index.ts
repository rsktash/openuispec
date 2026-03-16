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
import { readFileSync as fsReadFileSync } from "node:fs";
import { relative } from "node:path";

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

server.registerTool(
  "openuispec_check",
  {
    description: "Run composite validation: schema validation, semantic linting, and prepare readiness check. Call after spec edits to verify correctness.",
    inputSchema: { target: targetSchema },
  },
  async ({ target }) => {
    try {
      return toolResult(buildCheckResult(target, projectCwd));
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
