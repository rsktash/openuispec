#!/usr/bin/env tsx
/**
 * Validate all TaskFlow example files against their OpenUISpec JSON Schemas.
 *
 * Usage:
 *   npm run validate              # validate everything
 *   npm run validate:tokens       # validate only tokens
 *   npx tsx schema/validate.ts screens flows  # multiple groups
 */

import { readFileSync, readdirSync } from "node:fs";
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
const EXAMPLES_DIR = resolve(SCHEMA_DIR, "..", "examples", "taskflow");

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
  return errors.length;
}

// ── validation groups ────────────────────────────────────────────────

const BASE = "https://openuispec.org/schema/";

interface ValidationGroup {
  label: string;
  run(ajv: AjvInstance): number;
}

const GROUPS: Record<string, ValidationGroup> = {
  manifest: {
    label: "Root manifest",
    run(ajv) {
      return validateFile(
        ajv,
        join(EXAMPLES_DIR, "openuispec.yaml"),
        `${BASE}openuispec.schema.json`,
      );
    },
  },

  tokens: {
    label: "Tokens",
    run(ajv) {
      let errors = 0;
      const tokenMap: Record<string, string> = {
        "color.yaml": "color.schema.json",
        "typography.yaml": "typography.schema.json",
        "spacing.yaml": "spacing.schema.json",
        "elevation.yaml": "elevation.schema.json",
        "motion.yaml": "motion.schema.json",
        "layout.yaml": "layout.schema.json",
        "themes.yaml": "themes.schema.json",
      };
      for (const [data, schema] of Object.entries(tokenMap)) {
        errors += validateFile(
          ajv,
          join(EXAMPLES_DIR, "tokens", data),
          `${BASE}tokens/${schema}`,
        );
      }
      return errors;
    },
  },

  screens: {
    label: "Screens",
    run(ajv) {
      let errors = 0;
      for (const f of listFiles(join(EXAMPLES_DIR, "screens"), ".yaml")) {
        errors += validateFile(ajv, f, `${BASE}screen.schema.json`);
      }
      return errors;
    },
  },

  flows: {
    label: "Flows",
    run(ajv) {
      let errors = 0;
      for (const f of listFiles(join(EXAMPLES_DIR, "flows"), ".yaml")) {
        errors += validateFile(ajv, f, `${BASE}flow.schema.json`);
      }
      return errors;
    },
  },

  platform: {
    label: "Platform",
    run(ajv) {
      let errors = 0;
      for (const f of listFiles(join(EXAMPLES_DIR, "platform"), ".yaml")) {
        errors += validateFile(ajv, f, `${BASE}platform.schema.json`);
      }
      return errors;
    },
  },

  locales: {
    label: "Locales",
    run(ajv) {
      let errors = 0;
      for (const f of listFiles(join(EXAMPLES_DIR, "locales"), ".json")) {
        errors += validateFile(ajv, f, `${BASE}locale.schema.json`);
      }
      return errors;
    },
  },
};

// ── main ─────────────────────────────────────────────────────────────

function main(): void {
  const args = process.argv.slice(2);
  const selected =
    args.length > 0
      ? args.filter((a) => a in GROUPS)
      : Object.keys(GROUPS);

  if (selected.length === 0) {
    console.error(
      `Unknown group(s). Available: ${Object.keys(GROUPS).join(", ")}`,
    );
    process.exit(2);
  }

  const ajv = buildAjv();
  let totalErrors = 0;

  for (const key of selected) {
    const group = GROUPS[key];
    console.log(`\n${group.label}:`);
    totalErrors += group.run(ajv);
  }

  console.log(`\n${"=".repeat(50)}`);
  if (totalErrors > 0) {
    console.log(`FAILED: ${totalErrors} total validation error(s)`);
    process.exit(1);
  } else {
    console.log("ALL PASSED: Every example file validates successfully");
  }
}

main();
