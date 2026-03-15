#!/usr/bin/env tsx
/**
 * Validate OpenUISpec files against their JSON Schemas.
 *
 * Usage:
 *   openuispec validate                    # validate all spec files
 *   openuispec validate tokens screens     # validate specific groups
 *   npm run validate                       # from repo (uses examples/taskflow/openuispec)
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import type { ErrorObject } from "ajv";
import YAML from "yaml";
import { runSemanticLint, collectSemanticLint, type Includes } from "./semantic-lint.js";

const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020") as typeof import("ajv").default;
const addFormats = require("ajv-formats") as typeof import("ajv-formats").default;

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const SCHEMA_DIR = resolve(__dirname);

type AjvInstance = InstanceType<typeof Ajv2020>;
type UnknownRecord = Record<string, unknown>;

interface UsageLint {
  path: string;
  message: string;
}

interface StandardContractRule {
  requiredProps?: string[];
  nonEmptyStringProps?: string[];
  validate?: (node: UnknownRecord, props: UnknownRecord, path: string) => UsageLint[];
}

// ── helpers ──────────────────────────────────────────────────────────

function loadJson(filePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(filePath, "utf-8")) as Record<string, unknown>;
}

function loadYaml(filePath: string): unknown {
  return YAML.parse(readFileSync(filePath, "utf-8"));
}

function loadData(filePath: string): unknown {
  return filePath.endsWith(".json") ? loadJson(filePath) : loadYaml(filePath);
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

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getSingleRootValue(data: unknown): unknown {
  if (!isRecord(data)) return undefined;
  const values = Object.values(data);
  return values.length === 1 ? values[0] : undefined;
}

const STANDARD_CONTRACT_RULES: Record<string, StandardContractRule> = {
  action_trigger: {
    requiredProps: ["label"],
    nonEmptyStringProps: ["label"],
  },
  data_display: {
    requiredProps: ["title"],
    nonEmptyStringProps: ["title"],
  },
  input_field: {
    requiredProps: ["label"],
    nonEmptyStringProps: ["label"],
    validate(node, props, path) {
      const inputType = node.input_type;
      if (inputType === "select" || inputType === "radio") {
        return hasOwnProp(props, "options")
          ? []
          : [{
              path,
              message: `contract "input_field" with input_type="${String(inputType)}" requires props.options`,
            }];
      }
      if (inputType === "slider") {
        return hasOwnProp(props, "range")
          ? []
          : [{
              path,
              message: 'contract "input_field" with input_type="slider" requires props.range',
            }];
      }
      return [];
    },
  },
  nav_container: {
    requiredProps: ["items"],
    validate(_node, props, path) {
      const items = props.items;
      if (!Array.isArray(items)) {
        return [];
      }
      const errors: UsageLint[] = [];
      for (const [index, item] of items.entries()) {
        const itemPath = `${path}/props/items/${index}`;
        if (!isRecord(item)) {
          errors.push({
            path: itemPath,
            message: "nav_container items must be objects",
          });
          continue;
        }
        for (const key of ["id", "label", "icon", "destination"]) {
          if (!hasOwnProp(item, key)) {
            errors.push({
              path: itemPath,
              message: `nav_container item requires "${key}"`,
            });
          }
        }
        if (hasOwnProp(item, "label") && !isNonEmptyString(item.label)) {
          errors.push({
            path: `${itemPath}/label`,
            message: 'nav_container item "label" must be a non-empty string',
          });
        }
      }
      return errors;
    },
  },
  feedback: {
    requiredProps: ["message"],
    nonEmptyStringProps: ["message"],
  },
  surface: {
    requiredProps: ["content"],
  },
  collection: {
    requiredProps: ["data", "item_contract", "item_props_map"],
  },
};

function hasOwnProp(obj: UnknownRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function validateStandardContractUsage(
  node: UnknownRecord,
  path: string,
): UsageLint[] {
  const contract = node.contract;
  if (typeof contract !== "string") return [];

  const rule = STANDARD_CONTRACT_RULES[contract];
  if (!rule) return [];

  const props = isRecord(node.props) ? node.props : {};
  const errors: UsageLint[] = [];

  for (const prop of rule.requiredProps ?? []) {
    if (!hasOwnProp(props, prop)) {
      errors.push({
        path,
        message: `contract "${contract}" requires props.${prop}`,
      });
    }
  }

  for (const prop of rule.nonEmptyStringProps ?? []) {
    if (hasOwnProp(props, prop) && !isNonEmptyString(props[prop])) {
      errors.push({
        path: `${path}/props/${prop}`,
        message: `props.${prop} for contract "${contract}" must be a non-empty string`,
      });
    }
  }

  errors.push(...(rule.validate?.(node, props, path) ?? []));
  return errors;
}

function lintSectionItems(items: unknown, path: string): UsageLint[] {
  if (!Array.isArray(items)) return [];
  const errors: UsageLint[] = [];

  for (const [index, item] of items.entries()) {
    const itemPath = `${path}/${index}`;
    if (!isRecord(item)) {
      continue;
    }

    errors.push(...validateStandardContractUsage(item, itemPath));

    if (Array.isArray(item.children)) {
      errors.push(...lintSectionItems(item.children, `${itemPath}/children`));
    }
  }

  return errors;
}

function lintScreenLikeDefinition(screenDef: unknown, path: string): UsageLint[] {
  if (!isRecord(screenDef)) return [];
  const errors: UsageLint[] = [];

  if (isRecord(screenDef.layout)) {
    errors.push(
      ...lintSectionItems(screenDef.layout.sections, `${path}/layout/sections`),
    );
  }

  if (isRecord(screenDef.navigation)) {
    errors.push(
      ...validateStandardContractUsage(
        screenDef.navigation,
        `${path}/navigation`,
      ),
    );
  }

  if (isRecord(screenDef.surfaces)) {
    for (const [surfaceId, surfaceDef] of Object.entries(screenDef.surfaces)) {
      const surfacePath = `${path}/surfaces/${surfaceId}`;
      if (!isRecord(surfaceDef)) {
        continue;
      }

      errors.push(...validateStandardContractUsage(surfaceDef, surfacePath));

      const props = isRecord(surfaceDef.props) ? surfaceDef.props : {};
      if (Array.isArray(props.content)) {
        errors.push(
          ...lintSectionItems(props.content, `${surfacePath}/props/content`),
        );
      }
    }
  }

  return errors;
}

function lintScreenFile(dataPath: string): number {
  const root = getSingleRootValue(loadData(dataPath));
  const errors = lintScreenLikeDefinition(root, basename(dataPath));
  if (errors.length === 0) {
    return 0;
  }

  console.log(`  FAIL  ${basename(dataPath)} (${errors.length} contract usage error(s))`);
  for (const error of errors.slice(0, 5)) {
    console.log(`        [${error.path}] ${error.message}`);
  }
  if (errors.length > 5) {
    console.log(`        ... and ${errors.length - 5} more`);
  }
  console.log(
    "        Hint: built-in contract instances inherit required props from the spec even when contracts/<name>.yaml does not restate them.",
  );
  return errors.length;
}

function lintFlowFile(dataPath: string): number {
  const root = getSingleRootValue(loadData(dataPath));
  if (!isRecord(root) || !isRecord(root.screens)) {
    return 0;
  }

  const errors: UsageLint[] = [];
  for (const [screenId, screenEntry] of Object.entries(root.screens)) {
    if (!isRecord(screenEntry) || !isRecord(screenEntry.screen_inline)) {
      continue;
    }
    errors.push(
      ...lintScreenLikeDefinition(
        screenEntry.screen_inline,
        `${basename(dataPath)}/screens/${screenId}/screen_inline`,
      ),
    );
  }

  if (errors.length === 0) {
    return 0;
  }

  console.log(`  FAIL  ${basename(dataPath)} (${errors.length} contract usage error(s))`);
  for (const error of errors.slice(0, 5)) {
    console.log(`        [${error.path}] ${error.message}`);
  }
  if (errors.length > 5) {
    console.log(`        ... and ${errors.length - 5} more`);
  }
  console.log(
    "        Hint: flow screen_inline sections follow the same built-in contract requirements as screens/*.yaml.",
  );
  return errors.length;
}

// ── collect variants (structured errors for --json) ──────────────────

interface JsonError {
  file: string;
  path: string;
  message: string;
}

function collectValidateFile(
  ajv: AjvInstance,
  dataPath: string,
  schemaId: string,
  label?: string,
): JsonError[] {
  const name = label ?? basename(dataPath);
  const data = loadData(dataPath);
  const validate = ajv.getSchema(schemaId);

  if (!validate) {
    return [{ file: name, path: "(root)", message: `schema ${schemaId} not found` }];
  }

  const valid = validate(data);
  if (valid) return [];

  const errors: ErrorObject[] = validate.errors ?? [];
  return errors.map((e) => ({
    file: name,
    path: e.instancePath || "(root)",
    message: e.message ?? "unknown error",
  }));
}

function collectLintScreenFile(dataPath: string): JsonError[] {
  const root = getSingleRootValue(loadData(dataPath));
  const errors = lintScreenLikeDefinition(root, basename(dataPath));
  return errors.map((e) => ({
    file: basename(dataPath),
    path: e.path,
    message: e.message,
  }));
}

function collectLintFlowFile(dataPath: string): JsonError[] {
  const root = getSingleRootValue(loadData(dataPath));
  if (!isRecord(root) || !isRecord(root.screens)) return [];

  const errors: UsageLint[] = [];
  for (const [screenId, screenEntry] of Object.entries(root.screens)) {
    if (!isRecord(screenEntry) || !isRecord(screenEntry.screen_inline)) continue;
    errors.push(
      ...lintScreenLikeDefinition(
        screenEntry.screen_inline,
        `${basename(dataPath)}/screens/${screenId}/screen_inline`,
      ),
    );
  }

  return errors.map((e) => ({
    file: basename(dataPath),
    path: e.path,
    message: e.message,
  }));
}

// ── build Ajv instance with all schemas ──────────────────────────────

function buildAjv(): AjvInstance {
  const ajv = new Ajv2020({
    strict: false,
    allErrors: true,
    verbose: true,
  });
  addFormats(ajv);

  const schemaFiles = [
    ...listFiles(join(SCHEMA_DIR, "defs"), ".schema.json"),
    ...listFiles(join(SCHEMA_DIR, "tokens"), ".schema.json"),
    ...listFiles(SCHEMA_DIR, ".schema.json"),
  ];

  const schemas = schemaFiles.map((f) => loadJson(f));
  ajv.addSchema(schemas);

  return ajv;
}

const BASE = "https://openuispec.org/schema/";

// ── validate one file ────────────────────────────────────────────────

function validateFile(
  ajv: AjvInstance,
  dataPath: string,
  schemaId: string,
  label?: string,
): number {
  const name = label ?? basename(dataPath);
  const data = loadData(dataPath);
  const validate = ajv.getSchema(schemaId);

  if (!validate) {
    console.log(`  SKIP  ${name} (schema ${schemaId} not found)`);
    return 1;
  }

  const valid = validate(data);
  if (valid) {
    console.log(`  OK    ${name}`);
    return 0;
  }

  // Convert schema URL to a local path for display
  const schemaRelPath = schemaId.replace(BASE, "");
  const schemaLocalPath = resolve(SCHEMA_DIR, schemaRelPath);

  const errors: ErrorObject[] = validate.errors ?? [];
  console.log(`  FAIL  ${name} (${errors.length} error(s))`);
  for (const e of errors.slice(0, 5)) {
    const instancePath = e.instancePath || "(root)";
    console.log(`        [${instancePath}] ${e.message}`);
    if (e.params) {
      const info = Object.entries(e.params)
        .map(([k, v]) => `${k}=${String(v)}`)
        .join(", ");
      if (info) console.log(`          ${info}`);
    }
  }
  if (errors.length > 5) {
    console.log(`        ... and ${errors.length - 5} more`);
  }

  // Show hint when root-level structure is wrong (missing wrapper key)
  const hasRootRequired = errors.some(
    (e) => !e.instancePath && e.keyword === "required",
  );
  const hasRootAdditional = errors.some(
    (e) => !e.instancePath && e.keyword === "additionalProperties",
  );
  if (hasRootRequired || hasRootAdditional) {
    const expectedKey = errors.find(
      (e) => !e.instancePath && e.keyword === "required",
    )?.params?.missingProperty as string | undefined;
    if (expectedKey) {
      console.log(
        `\n        Hint: "${name}" needs a root "${expectedKey}:" wrapper key.`,
      );
      console.log(`        Example:`);
      console.log(`          ${expectedKey}:`);
      console.log(`            ...your content here...`);
    } else {
      console.log(
        `\n        Hint: This file has unexpected top-level properties.`,
      );
    }
  }

  console.log(`        Schema: ${schemaLocalPath}`);

  return errors.length;
}

// ── includes resolution ──────────────────────────────────────────────

const DEFAULT_INCLUDES: Includes = {
  tokens: "./tokens/",
  contracts: "./contracts/",
  screens: "./screens/",
  flows: "./flows/",
  platform: "./platform/",
  locales: "./locales/",
};

function readIncludes(projectDir: string): Includes {
  const manifestPath = join(projectDir, "openuispec.yaml");
  try {
    const manifest = loadYaml(manifestPath) as Record<string, unknown>;
    const inc = manifest?.includes as Partial<Includes> | undefined;
    return { ...DEFAULT_INCLUDES, ...inc };
  } catch {
    return DEFAULT_INCLUDES;
  }
}

function resolveInclude(projectDir: string, includePath: string): string {
  return resolve(projectDir, includePath);
}

// ── validation groups ────────────────────────────────────────────────

interface JsonGroupResult {
  group: string;
  errors: JsonError[];
}

interface ValidationGroup {
  label: string;
  run(ajv: AjvInstance, projectDir: string, includes: Includes): number;
  collectJson(ajv: AjvInstance, projectDir: string, includes: Includes, groupKey: string): JsonGroupResult;
}

const GROUPS: Record<string, ValidationGroup> = {
  manifest: {
    label: "Root manifest",
    run(ajv, projectDir) {
      return validateFile(
        ajv,
        join(projectDir, "openuispec.yaml"),
        `${BASE}openuispec.schema.json`,
      );
    },
    collectJson(ajv, projectDir, _includes, groupKey) {
      return {
        group: groupKey,
        errors: collectValidateFile(ajv, join(projectDir, "openuispec.yaml"), `${BASE}openuispec.schema.json`),
      };
    },
  },

  tokens: {
    label: "Tokens",
    run(ajv, projectDir, includes) {
      let errors = 0;
      const tokensDir = resolveInclude(projectDir, includes.tokens);
      const tokenMap: Record<string, string> = {
        "color.yaml": "color.schema.json",
        "typography.yaml": "typography.schema.json",
        "spacing.yaml": "spacing.schema.json",
        "elevation.yaml": "elevation.schema.json",
        "motion.yaml": "motion.schema.json",
        "layout.yaml": "layout.schema.json",
        "themes.yaml": "themes.schema.json",
        "icons.yaml": "icons.schema.json",
      };
      for (const [data, schema] of Object.entries(tokenMap)) {
        const filePath = join(tokensDir, data);
        if (existsSync(filePath)) {
          errors += validateFile(ajv, filePath, `${BASE}tokens/${schema}`);
        }
      }
      return errors;
    },
    collectJson(ajv, projectDir, includes, groupKey) {
      const errors: JsonError[] = [];
      const tokensDir = resolveInclude(projectDir, includes.tokens);
      const tokenMap: Record<string, string> = {
        "color.yaml": "color.schema.json",
        "typography.yaml": "typography.schema.json",
        "spacing.yaml": "spacing.schema.json",
        "elevation.yaml": "elevation.schema.json",
        "motion.yaml": "motion.schema.json",
        "layout.yaml": "layout.schema.json",
        "themes.yaml": "themes.schema.json",
        "icons.yaml": "icons.schema.json",
      };
      for (const [data, schema] of Object.entries(tokenMap)) {
        const filePath = join(tokensDir, data);
        if (existsSync(filePath)) {
          errors.push(...collectValidateFile(ajv, filePath, `${BASE}tokens/${schema}`));
        }
      }
      return { group: groupKey, errors };
    },
  },

  screens: {
    label: "Screens",
    run(ajv, projectDir, includes) {
      let errors = 0;
      const dir = resolveInclude(projectDir, includes.screens);
      for (const f of listFiles(dir, ".yaml")) {
        const schemaErrors = validateFile(ajv, f, `${BASE}screen.schema.json`);
        errors += schemaErrors;
        if (schemaErrors === 0) {
          errors += lintScreenFile(f);
        }
      }
      return errors;
    },
    collectJson(ajv, projectDir, includes, groupKey) {
      const errors: JsonError[] = [];
      const dir = resolveInclude(projectDir, includes.screens);
      for (const f of listFiles(dir, ".yaml")) {
        const schemaErrors = collectValidateFile(ajv, f, `${BASE}screen.schema.json`);
        errors.push(...schemaErrors);
        if (schemaErrors.length === 0) {
          errors.push(...collectLintScreenFile(f));
        }
      }
      return { group: groupKey, errors };
    },
  },

  flows: {
    label: "Flows",
    run(ajv, projectDir, includes) {
      let errors = 0;
      const dir = resolveInclude(projectDir, includes.flows);
      for (const f of listFiles(dir, ".yaml")) {
        const schemaErrors = validateFile(ajv, f, `${BASE}flow.schema.json`);
        errors += schemaErrors;
        if (schemaErrors === 0) {
          errors += lintFlowFile(f);
        }
      }
      return errors;
    },
    collectJson(ajv, projectDir, includes, groupKey) {
      const errors: JsonError[] = [];
      const dir = resolveInclude(projectDir, includes.flows);
      for (const f of listFiles(dir, ".yaml")) {
        const schemaErrors = collectValidateFile(ajv, f, `${BASE}flow.schema.json`);
        errors.push(...schemaErrors);
        if (schemaErrors.length === 0) {
          errors.push(...collectLintFlowFile(f));
        }
      }
      return { group: groupKey, errors };
    },
  },

  platform: {
    label: "Platform",
    run(ajv, projectDir, includes) {
      let errors = 0;
      const dir = resolveInclude(projectDir, includes.platform);
      for (const f of listFiles(dir, ".yaml")) {
        errors += validateFile(ajv, f, `${BASE}platform.schema.json`);
      }
      return errors;
    },
    collectJson(ajv, projectDir, includes, groupKey) {
      const errors: JsonError[] = [];
      const dir = resolveInclude(projectDir, includes.platform);
      for (const f of listFiles(dir, ".yaml")) {
        errors.push(...collectValidateFile(ajv, f, `${BASE}platform.schema.json`));
      }
      return { group: groupKey, errors };
    },
  },

  locales: {
    label: "Locales",
    run(ajv, projectDir, includes) {
      let errors = 0;
      const dir = resolveInclude(projectDir, includes.locales);
      for (const f of listFiles(dir, ".json")) {
        errors += validateFile(ajv, f, `${BASE}locale.schema.json`);
      }
      return errors;
    },
    collectJson(ajv, projectDir, includes, groupKey) {
      const errors: JsonError[] = [];
      const dir = resolveInclude(projectDir, includes.locales);
      for (const f of listFiles(dir, ".json")) {
        errors.push(...collectValidateFile(ajv, f, `${BASE}locale.schema.json`));
      }
      return { group: groupKey, errors };
    },
  },

  contracts: {
    label: "Contracts",
    run(ajv, projectDir, includes) {
      let errors = 0;
      const dir = resolveInclude(projectDir, includes.contracts);
      for (const f of listFiles(dir, ".yaml")) {
        const name = basename(f);
        if (name.startsWith("x_")) {
          errors += validateFile(ajv, f, `${BASE}custom-contract.schema.json`);
        } else {
          errors += validateFile(ajv, f, `${BASE}contract.schema.json`);
        }
      }
      return errors;
    },
    collectJson(ajv, projectDir, includes, groupKey) {
      const errors: JsonError[] = [];
      const dir = resolveInclude(projectDir, includes.contracts);
      for (const f of listFiles(dir, ".yaml")) {
        const name = basename(f);
        if (name.startsWith("x_")) {
          errors.push(...collectValidateFile(ajv, f, `${BASE}custom-contract.schema.json`));
        } else {
          errors.push(...collectValidateFile(ajv, f, `${BASE}contract.schema.json`));
        }
      }
      return { group: groupKey, errors };
    },
  },

  semantic: {
    label: "Semantic",
    run(_ajv, projectDir, includes) {
      return runSemanticLint(projectDir, includes);
    },
    collectJson(_ajv, projectDir, includes, groupKey) {
      const lintErrors = collectSemanticLint(projectDir, includes);
      return {
        group: groupKey,
        errors: lintErrors.map((e) => ({
          file: e.path.includes("/") ? e.path.split("/")[0] : e.path,
          path: e.path,
          message: e.message,
        })),
      };
    },
  },
};

// ── project resolution ───────────────────────────────────────────────

function findProjectDir(cwd: string): string {
  const candidates = [
    join(cwd, "openuispec"),
    cwd,
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, "openuispec.yaml"))) {
      return dir;
    }
  }
  // Fallback for running from repo root with examples/
  const exampleCandidates = [
    join(cwd, "examples", "taskflow", "openuispec"),
    join(cwd, "examples", "taskflow"),
  ];
  for (const dir of exampleCandidates) {
    if (existsSync(join(dir, "openuispec.yaml"))) {
      return dir;
    }
  }
  console.error(
    "Error: No openuispec.yaml found.\n" +
      "Run from a directory containing openuispec.yaml or an openuispec/ subdirectory."
  );
  process.exit(1);
}

// ── main ─────────────────────────────────────────────────────────────

export { buildAjv, readIncludes, GROUPS };
export type { JsonGroupResult, JsonError };

export function runValidate(argv: string[]): void {
  const jsonMode = argv.includes("--json");
  const filteredArgs = argv.filter((a) => a !== "--json");

  const selected =
    filteredArgs.length > 0
      ? filteredArgs.filter((a) => a in GROUPS)
      : Object.keys(GROUPS);

  if (selected.length === 0) {
    console.error(
      `Unknown group(s). Available: ${Object.keys(GROUPS).join(", ")}`,
    );
    process.exit(1);
  }

  const projectDir = findProjectDir(process.cwd());
  const includes = readIncludes(projectDir);
  const ajv = buildAjv();

  if (jsonMode) {
    const groups: JsonGroupResult[] = [];
    let totalErrors = 0;

    for (const key of selected) {
      const result = GROUPS[key].collectJson(ajv, projectDir, includes, key);
      groups.push(result);
      totalErrors += result.errors.length;
    }

    console.log(JSON.stringify({ groups, total_errors: totalErrors }, null, 2));

    if (totalErrors > 0) {
      process.exit(2);
    }
    return;
  }

  let totalErrors = 0;

  for (const key of selected) {
    const group = GROUPS[key];
    console.log(`\n${group.label}:`);
    totalErrors += group.run(ajv, projectDir, includes);
  }

  console.log(`\n${"=".repeat(50)}`);
  if (totalErrors > 0) {
    console.log(`FAILED: ${totalErrors} total validation error(s)`);
    process.exit(2);
  } else {
    console.log("ALL PASSED: Every example file validates successfully");
  }
}

// Direct execution
const isDirectRun =
  process.argv[1]?.endsWith("validate.ts") ||
  process.argv[1]?.endsWith("validate.js");

if (isDirectRun) {
  runValidate(process.argv.slice(2));
}
