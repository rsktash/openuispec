#!/usr/bin/env tsx
/**
 * Hash-based drift detection for OpenUISpec projects.
 *
 * Tracks spec changes via content hashes so you know what to
 * re-generate or review after editing spec files.
 * Stub screens/flows are reported separately and don't fail CI.
 *
 * Usage:
 *   openuispec drift --target ios           # check drift for ios
 *   openuispec drift                        # check all targets with snapshots
 *   openuispec drift --snapshot --target ios # snapshot for ios
 *   openuispec drift --json --target ios    # machine-readable output
 *   openuispec drift --target ios --all     # include stubs in drift count
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join, relative, basename, dirname } from "node:path";
import { createHash } from "node:crypto";
import YAML from "yaml";

const STATE_FILE = ".openuispec-state.json";

// ── types ─────────────────────────────────────────────────────────────

interface FileEntry {
  hash: string;
  status: string;
}

interface StateFile {
  spec_version: string;
  snapshot_at: string;
  target: string;
  files: Record<string, FileEntry>;
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

/** Read the status field from a screen or flow YAML file. */
function readStatus(filePath: string): string {
  try {
    const doc = YAML.parse(readFileSync(filePath, "utf-8"));
    if (doc && typeof doc === "object") {
      const rootKey = Object.keys(doc)[0];
      const def = doc[rootKey];
      if (def && typeof def.status === "string") {
        return def.status;
      }
    }
  } catch {
    // If we can't parse, treat as ready
  }
  return "ready";
}

/** Returns true if a file is a screen or flow (has status semantics). */
function hasStatusSemantics(relPath: string): boolean {
  const dir = dirname(relPath);
  return dir === "screens" || dir === "flows";
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

  if (includes.tokens) {
    files.push(...listFiles(resolve(projectDir, includes.tokens), ".yaml"));
  }
  if (includes.screens) {
    files.push(...listFiles(resolve(projectDir, includes.screens), ".yaml"));
  }
  if (includes.flows) {
    files.push(...listFiles(resolve(projectDir, includes.flows), ".yaml"));
  }
  if (includes.platform) {
    files.push(...listFiles(resolve(projectDir, includes.platform), ".yaml"));
  }
  if (includes.locales) {
    files.push(...listFiles(resolve(projectDir, includes.locales), ".json"));
  }
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

// ── project resolution ───────────────────────────────────────────────

/** Find the spec project directory by looking for openuispec.yaml. */
function findProjectDir(cwd: string): string {
  const candidates = [
    join(cwd, "openuispec"),
    cwd,
    // Fallback for running from repo root with examples/
    join(cwd, "examples", "taskflow"),
  ];
  for (const dir of candidates) {
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

/** Read the project name from the manifest. */
function readProjectName(projectDir: string): string {
  const doc = YAML.parse(
    readFileSync(join(projectDir, "openuispec.yaml"), "utf-8")
  );
  return doc.project?.name ?? basename(projectDir);
}

/** Read per-target output_dir map from the manifest. */
function readOutputDirs(projectDir: string): Record<string, string> {
  try {
    const doc = YAML.parse(readFileSync(join(projectDir, "openuispec.yaml"), "utf-8"));
    return doc.generation?.output_dir ?? {};
  } catch {
    return {};
  }
}

/** Resolve the generated output directory for a target. */
function resolveOutputDir(projectDir: string, projectName: string, target: string): string {
  const outputDirs = readOutputDirs(projectDir);
  if (outputDirs[target]) {
    return resolve(projectDir, outputDirs[target]);
  }
  // Default: generated/<target>/<project_name> relative to cwd
  return resolve(projectDir, "..", "generated", target, projectName);
}

function stateFilePath(projectDir: string, projectName: string, target: string): string {
  return join(resolveOutputDir(projectDir, projectName, target), STATE_FILE);
}

function discoverTargets(projectDir: string, projectName: string): string[] {
  const outputDirs = readOutputDirs(projectDir);
  const targets: string[] = [];

  // Check configured output_dir entries
  for (const [target, dir] of Object.entries(outputDirs)) {
    const resolved = resolve(projectDir, dir);
    if (existsSync(join(resolved, STATE_FILE))) {
      targets.push(target);
    }
  }

  // Also check default generated/ directory
  const generatedDir = resolve(projectDir, "..", "generated");
  if (existsSync(generatedDir)) {
    try {
      for (const entry of readdirSync(generatedDir)) {
        if (!targets.includes(entry)) {
          const defaultPath = join(generatedDir, entry, projectName, STATE_FILE);
          if (existsSync(defaultPath)) {
            targets.push(entry);
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return targets.sort();
}

/**
 * Normalize a state file entry. Handles backward compatibility
 * with old format where files were stored as plain hash strings.
 */
function normalizeEntry(value: string | FileEntry): FileEntry {
  if (typeof value === "string") {
    return { hash: value, status: "ready" };
  }
  return value;
}

// ── snapshot ──────────────────────────────────────────────────────────

function snapshot(cwd: string, projectDir: string, target: string): void {
  const projectName = readProjectName(projectDir);
  const outDir = resolveOutputDir(projectDir, projectName, target);
  if (!existsSync(outDir)) {
    console.error(
      `Error: Output directory not found: ${relative(cwd, outDir)}\n` +
        `Run code generation for "${target}" first.`
    );
    process.exit(1);
  }

  const files = discoverSpecFiles(projectDir);
  const doc = YAML.parse(readFileSync(join(projectDir, "openuispec.yaml"), "utf-8"));

  const entries: Record<string, FileEntry> = {};
  let stubCount = 0;

  for (const f of files) {
    const rel = relative(projectDir, f);
    const status = hasStatusSemantics(rel) ? readStatus(f) : "ready";
    entries[rel] = { hash: hashFile(f), status };
    if (status === "stub") stubCount++;
  }

  const state: StateFile = {
    spec_version: doc.spec_version ?? "0.1",
    snapshot_at: new Date().toISOString(),
    target,
    files: entries,
  };

  const outPath = stateFilePath(projectDir, projectName, target);
  writeFileSync(outPath, JSON.stringify(state, null, 2) + "\n");
  console.log(`Snapshot saved: ${relative(cwd, outPath)}`);
  console.log(`  ${Object.keys(entries).length} files hashed`);
  if (stubCount > 0) {
    console.log(`  ${stubCount} stubs (not tracked for drift)`);
  }
  console.log(`  target: ${target}`);
}

// ── check ─────────────────────────────────────────────────────────────

interface CheckResult {
  state: StateFile;
  drift: DriftResult;
  stubDrift: DriftResult;
  statuses: Record<string, string>;
}

function computeDrift(
  projectDir: string,
  state: StateFile,
  includeAll: boolean
): CheckResult {
  const files = discoverSpecFiles(projectDir);

  const current: Record<string, FileEntry> = {};
  for (const f of files) {
    const rel = relative(projectDir, f);
    const status = hasStatusSemantics(rel) ? readStatus(f) : "ready";
    current[rel] = { hash: hashFile(f), status };
  }

  const drift: DriftResult = { changed: [], added: [], removed: [], unchanged: [] };
  const stubDrift: DriftResult = { changed: [], added: [], removed: [], unchanged: [] };
  const statuses: Record<string, string> = {};

  for (const [rel, entry] of Object.entries(current)) {
    const currentStatus = entry.status;
    statuses[rel] = currentStatus;
    const bucket = currentStatus === "stub" && !includeAll ? stubDrift : drift;

    const snapshotEntry = state.files[rel]
      ? normalizeEntry(state.files[rel] as string | FileEntry)
      : null;

    if (!snapshotEntry) {
      bucket.added.push(rel);
    } else if (snapshotEntry.hash !== entry.hash) {
      bucket.changed.push(rel);
    } else {
      bucket.unchanged.push(rel);
    }
  }

  for (const [rel, raw] of Object.entries(state.files)) {
    if (!(rel in current)) {
      const entry = normalizeEntry(raw as string | FileEntry);
      statuses[rel] = entry.status;
      const bucket = entry.status === "stub" && !includeAll ? stubDrift : drift;
      bucket.removed.push(rel);
    }
  }

  return { state, drift, stubDrift, statuses };
}

function check(
  cwd: string,
  projectDir: string,
  target: string,
  jsonOutput: boolean,
  includeAll: boolean
): void {
  const projectName = readProjectName(projectDir);
  const statePath = stateFilePath(projectDir, projectName, target);
  if (!existsSync(statePath)) {
    console.error(
      `No snapshot found for target "${target}".\n` +
        `Run: openuispec drift --snapshot --target ${target}`
    );
    process.exit(1);
  }

  const state: StateFile = JSON.parse(readFileSync(statePath, "utf-8"));
  const result = computeDrift(projectDir, state, includeAll);

  if (jsonOutput) {
    printJson(result);
  } else {
    printReport(projectDir, result);
  }

  const d = result.drift;
  const hasDrift = d.changed.length > 0 || d.added.length > 0 || d.removed.length > 0;
  process.exit(hasDrift ? 1 : 0);
}

function checkAll(
  cwd: string,
  projectDir: string,
  jsonOutput: boolean,
  includeAll: boolean
): void {
  const projectName = readProjectName(projectDir);
  const targets = discoverTargets(projectDir, projectName);
  if (targets.length === 0) {
    console.error(
      "No snapshots found. Run: openuispec drift --snapshot --target <target>"
    );
    process.exit(1);
  }

  let anyDrift = false;

  for (const target of targets) {
    const statePath = stateFilePath(projectDir, projectName, target);
    const state: StateFile = JSON.parse(readFileSync(statePath, "utf-8"));
    const result = computeDrift(projectDir, state, includeAll);

    if (jsonOutput) {
      printJson(result);
    } else {
      printReport(projectDir, result);
    }

    const d = result.drift;
    const hasDrift = d.changed.length > 0 || d.added.length > 0 || d.removed.length > 0;
    if (hasDrift) anyDrift = true;

    if (targets.length > 1 && target !== targets[targets.length - 1]) {
      console.log("");
    }
  }

  process.exit(anyDrift ? 1 : 0);
}

// ── output ────────────────────────────────────────────────────────────

function printJson(result: CheckResult): void {
  const stubTotal =
    result.stubDrift.changed.length +
    result.stubDrift.added.length +
    result.stubDrift.removed.length +
    result.stubDrift.unchanged.length;

  console.log(
    JSON.stringify(
      {
        snapshot_at: result.state.snapshot_at,
        target: result.state.target,
        ...result.drift,
        stubs: stubTotal > 0 ? result.stubDrift : undefined,
      },
      null,
      2
    )
  );
}

function printReport(projectDir: string, result: CheckResult): void {
  const projectName = readProjectName(projectDir);

  console.log("OpenUISpec Drift Check");
  console.log("======================");
  console.log(`Project: ${projectName}`);
  console.log(`Snapshot: ${result.state.snapshot_at}`);
  console.log(`Target: ${result.state.target}`);

  const d = result.drift;

  const allTracked = new Set([
    ...d.unchanged,
    ...d.changed,
    ...d.added,
    ...d.removed,
  ]);

  const categories = new Map<string, string[]>();
  for (const f of allTracked) {
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
      if (d.changed.includes(f)) {
        console.log(`  \u2717  ${name} (changed)`);
      } else if (d.added.includes(f)) {
        console.log(`  +  ${name} (added)`);
      } else if (d.removed.includes(f)) {
        console.log(`  -  ${name} (removed)`);
      } else {
        console.log(`  \u2713  ${name}`);
      }
    }
  }

  const sd = result.stubDrift;
  const allStubs = [
    ...sd.unchanged,
    ...sd.changed,
    ...sd.added,
    ...sd.removed,
  ];

  if (allStubs.length > 0) {
    console.log("\nStubs (not tracked)");
    allStubs.sort();
    for (const f of allStubs) {
      const name = basename(f);
      const hasChange =
        sd.changed.includes(f) || sd.added.includes(f) || sd.removed.includes(f);
      console.log(`  \u00b7  ${name}${hasChange ? " (changed)" : ""}`);
    }
  }

  const stubCount = allStubs.length;
  const stubSuffix = stubCount > 0 ? ` (${stubCount} stubs skipped)` : "";
  console.log(
    `\nSummary: ${d.changed.length} changed, ${d.added.length} added, ${d.removed.length} removed${stubSuffix}`
  );
}

// ── main ──────────────────────────────────────────────────────────────

export function runDrift(argv: string[]): void {
  const isSnapshot = argv.includes("--snapshot");
  const isJson = argv.includes("--json");
  const includeAll = argv.includes("--all");

  const targetIdx = argv.indexOf("--target");
  const target = targetIdx !== -1 && argv[targetIdx + 1] ? argv[targetIdx + 1] : null;

  const cwd = process.cwd();
  const projectDir = findProjectDir(cwd);

  if (isSnapshot) {
    if (!target) {
      console.error("Error: --target is required for --snapshot");
      console.error("Usage: openuispec drift --snapshot --target <target>");
      process.exit(1);
    }
    snapshot(cwd, projectDir, target);
  } else if (target) {
    check(cwd, projectDir, target, isJson, includeAll);
  } else {
    checkAll(cwd, projectDir, isJson, includeAll);
  }
}

// Direct execution
const isDirectRun =
  process.argv[1]?.endsWith("drift/index.ts") ||
  process.argv[1]?.endsWith("drift/index.js");

if (isDirectRun) {
  runDrift(process.argv.slice(2));
}
