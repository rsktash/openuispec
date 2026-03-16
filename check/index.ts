#!/usr/bin/env tsx
/**
 * Composite check command for OpenUISpec projects.
 *
 * Combines schema validation, semantic linting, and prepare readiness
 * into a single call for AI agents.
 *
 * Usage:
 *   openuispec check --target web           # human-readable summary
 *   openuispec check --target ios --json    # machine-readable output
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import YAML from "yaml";
import {
  findProjectDir,
  readManifest,
  readProjectName,
  resolveOutputDir,
} from "../drift/index.js";
import {
  buildAjv,
  readIncludes,
  GROUPS,
  type JsonGroupResult,
} from "../schema/validate.js";
import { collectSemanticLint } from "../schema/semantic-lint.js";

// ── types ─────────────────────────────────────────────────────────────

interface CheckValidation {
  total_errors: number;
  groups: JsonGroupResult[];
}

interface CheckSemantic {
  total_errors: number;
  errors: Array<{ path: string; message: string }>;
}

interface CheckPrepare {
  mode: "bootstrap" | "update";
  ready: boolean;
  missing: string[];
  warnings: string[];
}

export interface CheckResult {
  target: string;
  validation: CheckValidation;
  semantic: CheckSemantic;
  prepare: CheckPrepare;
}

// ── prepare readiness helpers ─────────────────────────────────────────

const PRESENTATION_ONLY_KEYS = new Set(["naming", "bundler", "css"]);

function platformStackKeys(target: string): string[] {
  switch (target) {
    case "android":
      return ["architecture", "state", "preferences", "database", "di", "naming"];
    case "web":
      return ["runtime", "routing", "state", "storage_backend", "bundler", "css", "naming"];
    case "ios":
      return ["architecture", "persistence", "di", "naming"];
    default:
      return [];
  }
}

function requiredPlatformDecisionKeys(target: string): string[] {
  return platformStackKeys(target).filter((key) => !PRESENTATION_ONLY_KEYS.has(key));
}

function readPlatformDefinition(
  projectDir: string,
  manifest: Record<string, any>,
  target: string,
): Record<string, any> {
  const platformDir = resolve(projectDir, manifest.includes?.platform ?? "./platform/");
  const platformPath = join(platformDir, `${target}.yaml`);
  if (!existsSync(platformPath)) return {};
  try {
    const doc = YAML.parse(readFileSync(platformPath, "utf-8"));
    return doc?.[target] ?? {};
  } catch {
    return {};
  }
}

function missingPlatformDecisions(
  target: string,
  platformDef: Record<string, any>,
): string[] {
  const generation = platformDef.generation ?? {};
  return requiredPlatformDecisionKeys(target).filter((key) => {
    const value = generation[key];
    return typeof value !== "string" || value.trim().length === 0;
  });
}

function hasApiEndpoints(manifest: Record<string, any>): boolean {
  const endpoints = manifest.api?.endpoints;
  return typeof endpoints === "object" && endpoints !== null && Object.keys(endpoints).length > 0;
}

function resolveBackendRoot(
  projectDir: string,
  manifest: Record<string, any>,
): string | null {
  const backendRoot = manifest.generation?.code_roots?.backend;
  if (typeof backendRoot !== "string" || backendRoot.trim().length === 0) {
    return null;
  }
  return resolve(projectDir, backendRoot);
}

function determinePrepare(
  projectDir: string,
  projectName: string,
  target: string,
): CheckPrepare {
  const manifest = readManifest(projectDir);
  const outputDir = resolveOutputDir(projectDir, projectName, target);
  const statePath = join(outputDir, ".openuispec-state.json");
  const snapshotExists = existsSync(statePath);
  const mode: "bootstrap" | "update" = snapshotExists ? "update" : "bootstrap";

  const platformDef = readPlatformDefinition(projectDir, manifest, target);
  const missing = missingPlatformDecisions(target, platformDef);
  const warnings: string[] = [];

  const backendContextRequired = hasApiEndpoints(manifest);
  const backendRoot = resolveBackendRoot(projectDir, manifest);
  const backendContextReady =
    !backendContextRequired || (backendRoot !== null && existsSync(backendRoot));

  if (!backendContextReady) {
    warnings.push(
      "api endpoints require generation.code_roots.backend to point at an existing backend folder",
    );
  }

  const stackConfirmation = platformDef.generation?.stack_confirmation;
  const pendingUserConfirmation =
    typeof stackConfirmation === "string" && stackConfirmation !== "confirmed";

  if (pendingUserConfirmation) {
    warnings.push(
      `Target stack for "${target}" requires explicit user confirmation before implementation.`,
    );
  }

  const ready =
    missing.length === 0 && backendContextReady && !pendingUserConfirmation;

  return { mode, ready, missing, warnings };
}

// ── core (importable, no process.exit) ───────────────────────────────

export function buildCheckResult(target: string, cwd: string = process.cwd()): CheckResult {
  const projectDir = findProjectDir(cwd);
  const projectName = readProjectName(projectDir);
  const includes = readIncludes(projectDir);
  const ajv = buildAjv();

  // 1. Schema validation (all groups except semantic)
  const schemaGroupKeys = Object.keys(GROUPS).filter((k) => k !== "semantic");
  const validationGroups: JsonGroupResult[] = [];
  let validationTotalErrors = 0;

  for (const key of schemaGroupKeys) {
    const result = GROUPS[key].collectJson(ajv, projectDir, includes, key);
    validationGroups.push(result);
    validationTotalErrors += result.errors.length;
  }

  const validation: CheckValidation = {
    total_errors: validationTotalErrors,
    groups: validationGroups,
  };

  // 2. Semantic validation
  const semanticErrors = collectSemanticLint(projectDir, includes);
  const semantic: CheckSemantic = {
    total_errors: semanticErrors.length,
    errors: semanticErrors.map((e) => ({ path: e.path, message: e.message })),
  };

  // 3. Prepare readiness
  const prepare = determinePrepare(projectDir, projectName, target);

  return { target, validation, semantic, prepare };
}

// ── main ──────────────────────────────────────────────────────────────

export function runCheck(argv: string[]): void {
  const isJson = argv.includes("--json");
  const targetIdx = argv.indexOf("--target");
  const target =
    targetIdx !== -1 && argv[targetIdx + 1] ? argv[targetIdx + 1] : null;

  if (!target) {
    console.error("Error: --target is required for check");
    console.error("Usage: openuispec check --target <target> [--json]");
    process.exit(1);
  }

  const result = buildCheckResult(target);

  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printReport(result);
  }

  // Exit codes: 0 = clean + ready, 2 = validation errors, 1 = config error
  const totalErrors = result.validation.total_errors + result.semantic.total_errors;
  if (totalErrors > 0) {
    process.exit(2);
  }
  if (!result.prepare.ready) {
    process.exit(2);
  }
  process.exit(0);
}

function printReport(result: CheckResult): void {
  console.log("OpenUISpec Check");
  console.log("================");
  console.log(`Target: ${result.target}`);

  const totalValidation = result.validation.total_errors;
  const totalSemantic = result.semantic.total_errors;

  console.log(`\nSchema validation: ${totalValidation === 0 ? "PASS" : `FAIL (${totalValidation} error(s))`}`);
  if (totalValidation > 0) {
    for (const group of result.validation.groups) {
      if (group.errors.length > 0) {
        console.log(`  ${group.group}: ${group.errors.length} error(s)`);
        for (const err of group.errors.slice(0, 3)) {
          console.log(`    [${err.file}] ${err.path}: ${err.message}`);
        }
        if (group.errors.length > 3) {
          console.log(`    ... and ${group.errors.length - 3} more`);
        }
      }
    }
  }

  console.log(`Semantic lint: ${totalSemantic === 0 ? "PASS" : `FAIL (${totalSemantic} error(s))`}`);
  if (totalSemantic > 0) {
    for (const err of result.semantic.errors.slice(0, 5)) {
      console.log(`  [${err.path}] ${err.message}`);
    }
    if (result.semantic.errors.length > 5) {
      console.log(`  ... and ${result.semantic.errors.length - 5} more`);
    }
  }

  console.log(`\nPrepare readiness: ${result.prepare.ready ? "READY" : "NOT READY"}`);
  console.log(`  Mode: ${result.prepare.mode}`);
  if (result.prepare.missing.length > 0) {
    console.log(`  Missing platform decisions: ${result.prepare.missing.join(", ")}`);
  }
  for (const w of result.prepare.warnings) {
    console.log(`  Warning: ${w}`);
  }

  const totalErrors = result.validation.total_errors + result.semantic.total_errors;
  console.log(
    `\nResult: ${totalErrors === 0 && result.prepare.ready ? "ALL CLEAR" : "ACTION NEEDED"}`,
  );
}

// Direct execution
const isDirectRun =
  process.argv[1]?.endsWith("check/index.ts") ||
  process.argv[1]?.endsWith("check/index.js");

if (isDirectRun) {
  runCheck(process.argv.slice(2));
}
