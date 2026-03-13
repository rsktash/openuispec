#!/usr/bin/env tsx
/**
 * Hash-based drift detection for OpenUISpec projects.
 *
 * Tracks spec changes via content hashes so you know what to
 * re-generate or review after editing spec files.
 *
 * Usage:
 *   npm run drift -- --target ios           # check drift for ios
 *   npm run drift                           # check all targets with snapshots
 *   npm run drift -- --snapshot --target ios # snapshot for ios
 *   npm run drift -- --json --target ios    # machine-readable output
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { resolve, join, relative, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import YAML from "yaml";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const PROJECT_DIR = resolve(REPO_ROOT, "examples", "taskflow");
const GENERATED_DIR = resolve(REPO_ROOT, "generated");
const STATE_FILE = ".openuispec-state.json";

// ── types ─────────────────────────────────────────────────────────────

interface StateFile {
  spec_version: string;
  snapshot_at: string;
  target: string;
  files: Record<string, string>;
}

interface DriftResult {
  changed: string[];
  added: string[];
  removed: string[];
  unchanged: string[];
}

// ── helpers ───────────────────────────────────────────────────────────

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

function hashFile(filePath: string): string {
  const content = readFileSync(filePath);
  const hash = createHash("sha256").update(content).digest("hex");
  return `sha256:${hash}`;
}

function discoverSpecFiles(projectDir: string): string[] {
  const manifest = join(projectDir, "openuispec.yaml");
  if (!existsSync(manifest)) {
    console.error(`Error: No openuispec.yaml found in ${projectDir}`);
    process.exit(1);
  }

  const doc = YAML.parse(readFileSync(manifest, "utf-8"));
  const includes = doc.includes ?? {};
  const files: string[] = [manifest];

  // Tokens
  if (includes.tokens) {
    files.push(...listFiles(resolve(projectDir, includes.tokens), ".yaml"));
  }

  // Screens
  if (includes.screens) {
    files.push(...listFiles(resolve(projectDir, includes.screens), ".yaml"));
  }

  // Flows
  if (includes.flows) {
    files.push(...listFiles(resolve(projectDir, includes.flows), ".yaml"));
  }

  // Platform
  if (includes.platform) {
    files.push(...listFiles(resolve(projectDir, includes.platform), ".yaml"));
  }

  // Locales
  if (includes.locales) {
    files.push(...listFiles(resolve(projectDir, includes.locales), ".json"));
  }

  // Custom contracts
  if (includes.contracts) {
    files.push(...listFiles(resolve(projectDir, includes.contracts), ".yaml"));
  }

  return files;
}

function categorize(relPath: string): string {
  if (relPath === "openuispec.yaml") return "Manifest";
  const dir = dirname(relPath);
  if (dir === "tokens") return "Tokens";
  if (dir === "screens") return "Screens";
  if (dir === "flows") return "Flows";
  if (dir === "platform") return "Platform";
  if (dir === "locales") return "Locales";
  if (dir === "contracts") return "Contracts";
  return "Other";
}

function resolveOutputDir(target: string): string {
  return resolve(GENERATED_DIR, target, "TaskFlow");
}

function stateFilePath(target: string): string {
  return join(resolveOutputDir(target), STATE_FILE);
}

/** Discover all targets that have an existing snapshot. */
function discoverTargets(): string[] {
  if (!existsSync(GENERATED_DIR)) return [];
  try {
    return readdirSync(GENERATED_DIR)
      .filter((entry) => existsSync(stateFilePath(entry)))
      .sort();
  } catch {
    return [];
  }
}

// ── snapshot ──────────────────────────────────────────────────────────

function snapshot(projectDir: string, target: string): void {
  const outDir = resolveOutputDir(target);
  if (!existsSync(outDir)) {
    console.error(
      `Error: Output directory not found: ${relative(REPO_ROOT, outDir)}\n` +
        `Run code generation for "${target}" first.`
    );
    process.exit(1);
  }

  const files = discoverSpecFiles(projectDir);
  const doc = YAML.parse(readFileSync(join(projectDir, "openuispec.yaml"), "utf-8"));

  const hashes: Record<string, string> = {};
  for (const f of files) {
    const rel = relative(projectDir, f);
    hashes[rel] = hashFile(f);
  }

  const state: StateFile = {
    spec_version: doc.spec_version ?? "0.1",
    snapshot_at: new Date().toISOString(),
    target,
    files: hashes,
  };

  const outPath = stateFilePath(target);
  writeFileSync(outPath, JSON.stringify(state, null, 2) + "\n");
  console.log(`Snapshot saved: ${relative(REPO_ROOT, outPath)}`);
  console.log(`  ${Object.keys(hashes).length} files hashed`);
  console.log(`  target: ${target}`);
}

// ── check ─────────────────────────────────────────────────────────────

function check(projectDir: string, target: string, jsonOutput: boolean): void {
  const statePath = stateFilePath(target);
  if (!existsSync(statePath)) {
    console.error(
      `No snapshot found for target "${target}".\n` +
        `Run: npm run drift -- --snapshot --target ${target}`
    );
    process.exit(1);
  }

  const state: StateFile = JSON.parse(readFileSync(statePath, "utf-8"));
  const files = discoverSpecFiles(projectDir);

  const currentHashes: Record<string, string> = {};
  for (const f of files) {
    currentHashes[relative(projectDir, f)] = hashFile(f);
  }

  const result: DriftResult = {
    changed: [],
    added: [],
    removed: [],
    unchanged: [],
  };

  // Check current files against snapshot
  for (const [rel, hash] of Object.entries(currentHashes)) {
    if (!(rel in state.files)) {
      result.added.push(rel);
    } else if (state.files[rel] !== hash) {
      result.changed.push(rel);
    } else {
      result.unchanged.push(rel);
    }
  }

  // Check for removed files
  for (const rel of Object.keys(state.files)) {
    if (!(rel in currentHashes)) {
      result.removed.push(rel);
    }
  }

  if (jsonOutput) {
    printJson(state, result);
  } else {
    printReport(projectDir, state, result);
  }

  const hasDrift =
    result.changed.length > 0 ||
    result.added.length > 0 ||
    result.removed.length > 0;
  process.exit(hasDrift ? 1 : 0);
}

function checkAll(projectDir: string, jsonOutput: boolean): void {
  const targets = discoverTargets();
  if (targets.length === 0) {
    console.error(
      "No snapshots found. Run: npm run drift -- --snapshot --target <target>"
    );
    process.exit(1);
  }

  let anyDrift = false;

  for (const target of targets) {
    const statePath = stateFilePath(target);
    const state: StateFile = JSON.parse(readFileSync(statePath, "utf-8"));
    const files = discoverSpecFiles(projectDir);

    const currentHashes: Record<string, string> = {};
    for (const f of files) {
      currentHashes[relative(projectDir, f)] = hashFile(f);
    }

    const result: DriftResult = {
      changed: [],
      added: [],
      removed: [],
      unchanged: [],
    };

    for (const [rel, hash] of Object.entries(currentHashes)) {
      if (!(rel in state.files)) {
        result.added.push(rel);
      } else if (state.files[rel] !== hash) {
        result.changed.push(rel);
      } else {
        result.unchanged.push(rel);
      }
    }

    for (const rel of Object.keys(state.files)) {
      if (!(rel in currentHashes)) {
        result.removed.push(rel);
      }
    }

    if (jsonOutput) {
      printJson(state, result);
    } else {
      printReport(projectDir, state, result);
    }

    const hasDrift =
      result.changed.length > 0 ||
      result.added.length > 0 ||
      result.removed.length > 0;
    if (hasDrift) anyDrift = true;

    if (targets.length > 1 && target !== targets[targets.length - 1]) {
      console.log("");
    }
  }

  process.exit(anyDrift ? 1 : 0);
}

// ── output ────────────────────────────────────────────────────────────

function printJson(state: StateFile, result: DriftResult): void {
  console.log(
    JSON.stringify(
      {
        snapshot_at: state.snapshot_at,
        target: state.target,
        ...result,
      },
      null,
      2
    )
  );
}

function printReport(
  projectDir: string,
  state: StateFile,
  result: DriftResult
): void {
  const doc = YAML.parse(
    readFileSync(join(projectDir, "openuispec.yaml"), "utf-8")
  );
  const projectName = doc.project?.name ?? basename(projectDir);

  console.log("OpenUISpec Drift Check");
  console.log("======================");
  console.log(`Project: ${projectName}`);
  console.log(`Snapshot: ${state.snapshot_at}`);
  console.log(`Target: ${state.target}`);

  // Group all files by category
  const allFiles = new Set([
    ...result.unchanged,
    ...result.changed,
    ...result.added,
    ...result.removed,
  ]);

  const categories = new Map<string, string[]>();
  for (const f of allFiles) {
    const cat = categorize(f);
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(f);
  }

  const order = [
    "Manifest",
    "Tokens",
    "Screens",
    "Flows",
    "Platform",
    "Locales",
    "Contracts",
    "Other",
  ];

  for (const cat of order) {
    const files = categories.get(cat);
    if (!files) continue;
    files.sort();

    console.log(`\n${cat}`);
    for (const f of files) {
      const name = basename(f);
      if (result.changed.includes(f)) {
        console.log(`  ✗  ${name} (changed)`);
      } else if (result.added.includes(f)) {
        console.log(`  +  ${name} (added)`);
      } else if (result.removed.includes(f)) {
        console.log(`  -  ${name} (removed)`);
      } else {
        console.log(`  ✓  ${name}`);
      }
    }
  }

  console.log(
    `\nSummary: ${result.changed.length} changed, ${result.added.length} added, ${result.removed.length} removed`
  );
}

// ── main ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isSnapshot = args.includes("--snapshot");
const isJson = args.includes("--json");

const targetIdx = args.indexOf("--target");
const target = targetIdx !== -1 && args[targetIdx + 1] ? args[targetIdx + 1] : null;

if (isSnapshot) {
  if (!target) {
    console.error("Error: --target is required for --snapshot");
    console.error("Usage: npm run drift -- --snapshot --target <target>");
    process.exit(1);
  }
  snapshot(PROJECT_DIR, target);
} else if (target) {
  check(PROJECT_DIR, target, isJson);
} else {
  checkAll(PROJECT_DIR, isJson);
}
