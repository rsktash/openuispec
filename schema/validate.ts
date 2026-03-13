#!/usr/bin/env tsx
/**
 * Validate OpenUISpec files against their JSON Schemas.
 *
 * Usage:
 *   openuispec validate                    # validate all spec files
 *   openuispec validate tokens screens     # validate specific groups
 *   npm run validate                       # from repo (uses examples/taskflow)
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import type { ErrorObject } from "ajv";
import YAML from "yaml";

const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020") as typeof import("ajv").default;
const addFormats = require("ajv-formats") as typeof import("ajv-formats").default;

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const SCHEMA_DIR = resolve(__dirname);

type AjvInstance = InstanceType<typeof Ajv2020>;

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
  const schemaLocalPath = schemaId.replace(
    BASE,
    "node_modules/openuispec/schema/",
  );

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

// ── validation groups ────────────────────────────────────────────────

interface ValidationGroup {
  label: string;
  run(ajv: AjvInstance, projectDir: string): number;
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
  },

  tokens: {
    label: "Tokens",
    run(ajv, projectDir) {
      let errors = 0;
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
        const filePath = join(projectDir, "tokens", data);
        if (existsSync(filePath)) {
          errors += validateFile(ajv, filePath, `${BASE}tokens/${schema}`);
        }
      }
      return errors;
    },
  },

  screens: {
    label: "Screens",
    run(ajv, projectDir) {
      let errors = 0;
      for (const f of listFiles(join(projectDir, "screens"), ".yaml")) {
        errors += validateFile(ajv, f, `${BASE}screen.schema.json`);
      }
      return errors;
    },
  },

  flows: {
    label: "Flows",
    run(ajv, projectDir) {
      let errors = 0;
      for (const f of listFiles(join(projectDir, "flows"), ".yaml")) {
        errors += validateFile(ajv, f, `${BASE}flow.schema.json`);
      }
      return errors;
    },
  },

  platform: {
    label: "Platform",
    run(ajv, projectDir) {
      let errors = 0;
      for (const f of listFiles(join(projectDir, "platform"), ".yaml")) {
        errors += validateFile(ajv, f, `${BASE}platform.schema.json`);
      }
      return errors;
    },
  },

  locales: {
    label: "Locales",
    run(ajv, projectDir) {
      let errors = 0;
      for (const f of listFiles(join(projectDir, "locales"), ".json")) {
        errors += validateFile(ajv, f, `${BASE}locale.schema.json`);
      }
      return errors;
    },
  },

  custom_contracts: {
    label: "Custom contracts",
    run(ajv, projectDir) {
      let errors = 0;
      for (const f of listFiles(join(projectDir, "contracts"), ".yaml")) {
        if (basename(f).startsWith("x_")) {
          errors += validateFile(
            ajv,
            f,
            `${BASE}custom-contract.schema.json`,
          );
        }
      }
      return errors;
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
  const examplesDir = join(cwd, "examples", "taskflow");
  if (existsSync(join(examplesDir, "openuispec.yaml"))) {
    return examplesDir;
  }
  console.error(
    "Error: No openuispec.yaml found.\n" +
      "Run from a directory containing openuispec.yaml or an openuispec/ subdirectory."
  );
  process.exit(1);
}

// ── main ─────────────────────────────────────────────────────────────

export function runValidate(argv: string[]): void {
  const selected =
    argv.length > 0
      ? argv.filter((a) => a in GROUPS)
      : Object.keys(GROUPS);

  if (selected.length === 0) {
    console.error(
      `Unknown group(s). Available: ${Object.keys(GROUPS).join(", ")}`,
    );
    process.exit(2);
  }

  const projectDir = findProjectDir(process.cwd());
  const ajv = buildAjv();
  let totalErrors = 0;

  for (const key of selected) {
    const group = GROUPS[key];
    console.log(`\n${group.label}:`);
    totalErrors += group.run(ajv, projectDir);
  }

  console.log(`\n${"=".repeat(50)}`);
  if (totalErrors > 0) {
    console.log(`FAILED: ${totalErrors} total validation error(s)`);
    process.exit(1);
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
