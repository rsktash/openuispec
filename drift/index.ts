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
 *   openuispec drift --target ios --explain # explain semantic changes since baseline
 *   openuispec drift --json --target ios    # machine-readable output
 *   openuispec drift --target ios --all     # include stubs in drift count
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join, relative, basename, dirname } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import YAML from "yaml";

const STATE_FILE = ".openuispec-state.json";
export const SUPPORTED_TARGETS = ["ios", "android", "web"] as const;
export type SupportedTarget = typeof SUPPORTED_TARGETS[number];

// ── types ─────────────────────────────────────────────────────────────

interface FileEntry {
  hash: string;
  status: string;
}

export interface StateFile {
  spec_version: string;
  snapshot_at: string;
  target: string;
  baseline?: BaselineRef;
  files: Record<string, FileEntry>;
}

export interface BaselineRef {
  kind: "git_commit" | "working_tree";
  commit: string | null;
  branch: string | null;
}

export interface DriftResult {
  changed: string[];
  added: string[];
  removed: string[];
  unchanged: string[];
}

export interface SemanticChange {
  kind: "added" | "removed" | "changed";
  path: string;
  before?: string;
  after?: string;
}

export interface FileExplanation {
  file: string;
  status: "added" | "removed" | "changed";
  changes: SemanticChange[];
  truncated: boolean;
}

export interface ExplainResult {
  available: boolean;
  note?: string;
  files: FileExplanation[];
}

// ── helpers ───────────────────────────────────────────────────────────

export function listFiles(dir: string, ext: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(ext))
      .sort()
      .map((f) => join(dir, f));
  } catch {
    return [];
  }
}

export function isSupportedTarget(value: string): value is SupportedTarget {
  return (SUPPORTED_TARGETS as readonly string[]).includes(value);
}

function hashFile(filePath: string): string {
  const content = readFileSync(filePath);
  const hash = createHash("sha256").update(content).digest("hex");
  return `sha256:${hash}`;
}

function readFileIfExists(filePath: string): string | null {
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

function parseSpecDocument(relPath: string, content: string): unknown {
  if (relPath.endsWith(".json")) {
    return JSON.parse(content);
  }
  return YAML.parse(content);
}

/** Read the status field from a screen or flow YAML file. */
export function readStatus(filePath: string): string {
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
export function hasStatusSemantics(relPath: string): boolean {
  const dir = dirname(relPath);
  return dir === "screens" || dir === "flows";
}

export function discoverSpecFiles(projectDir: string): string[] {
  const manifest = join(projectDir, "openuispec.yaml");
  if (!existsSync(manifest)) {
    throw new Error(`No openuispec.yaml found in ${projectDir}`);
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

function runGit(args: string[], cwd: string): string | null {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function gitPathForFile(projectDir: string, relPath: string): string | null {
  const repoRoot = runGit(["rev-parse", "--show-toplevel"], projectDir);
  if (!repoRoot) return null;
  return relative(repoRoot, join(projectDir, relPath));
}

function readFileFromGit(projectDir: string, commit: string, relPath: string): string | null {
  const gitPath = gitPathForFile(projectDir, relPath);
  if (!gitPath) return null;
  return runGit(["show", `${commit}:${gitPath}`], projectDir);
}

function captureBaseline(projectDir: string, files: string[]): BaselineRef | undefined {
  const repoRoot = runGit(["rev-parse", "--show-toplevel"], projectDir);
  if (!repoRoot) return undefined;

  const branch = runGit(["branch", "--show-current"], projectDir);
  const commit = runGit(["rev-parse", "HEAD"], projectDir);
  const repoPaths = files.map((file) => relative(repoRoot, file));
  const status = runGit(["status", "--porcelain", "--", ...repoPaths], projectDir) ?? "";

  return {
    kind: status.length > 0 ? "working_tree" : "git_commit",
    commit,
    branch: branch || null,
  };
}

export function formatBaseline(baseline?: BaselineRef): string | null {
  if (!baseline) return null;

  const ref = baseline.commit ? baseline.commit.slice(0, 12) : "uncommitted";
  const branchSuffix = baseline.branch ? ` on ${baseline.branch}` : "";

  if (baseline.kind === "git_commit") {
    return `${ref}${branchSuffix} (exact git baseline)`;
  }

  return `${ref}${branchSuffix} + working tree spec changes`;
}

const MAX_CHANGES_PER_FILE = 20;
const MAX_VALUE_LENGTH = 120;

function summarizeValue(value: unknown): string {
  if (typeof value === "string") {
    return value.length > MAX_VALUE_LENGTH
      ? JSON.stringify(`${value.slice(0, MAX_VALUE_LENGTH - 1)}…`)
      : JSON.stringify(value);
  }

  const serialized = JSON.stringify(value);
  if (!serialized) return String(value);
  return serialized.length > MAX_VALUE_LENGTH
    ? `${serialized.slice(0, MAX_VALUE_LENGTH - 1)}…`
    : serialized;
}

function compareSemanticValue(
  path: string,
  before: unknown,
  after: unknown,
  changes: SemanticChange[]
): void {
  if (changes.length >= MAX_CHANGES_PER_FILE) return;

  if (before === undefined && after === undefined) return;
  if (before === undefined) {
    changes.push({ kind: "added", path, after: summarizeValue(after) });
    return;
  }
  if (after === undefined) {
    changes.push({ kind: "removed", path, before: summarizeValue(before) });
    return;
  }

  if (Array.isArray(before) || Array.isArray(after)) {
    if (!Array.isArray(before) || !Array.isArray(after)) {
      changes.push({
        kind: "changed",
        path,
        before: summarizeValue(before),
        after: summarizeValue(after),
      });
      return;
    }

    const maxLength = Math.max(before.length, after.length);
    for (let index = 0; index < maxLength; index += 1) {
      compareSemanticValue(`${path}[${index}]`, before[index], after[index], changes);
      if (changes.length >= MAX_CHANGES_PER_FILE) return;
    }
    return;
  }

  if (
    before &&
    after &&
    typeof before === "object" &&
    typeof after === "object"
  ) {
    const beforeObj = before as Record<string, unknown>;
    const afterObj = after as Record<string, unknown>;
    const keys = Array.from(new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)])).sort();

    for (const key of keys) {
      const nextPath = path ? `${path}.${key}` : key;
      compareSemanticValue(nextPath, beforeObj[key], afterObj[key], changes);
      if (changes.length >= MAX_CHANGES_PER_FILE) return;
    }
    return;
  }

  if (before !== after) {
    changes.push({
      kind: "changed",
      path,
      before: summarizeValue(before),
      after: summarizeValue(after),
    });
  }
}

function explainFileChange(
  projectDir: string,
  baselineCommit: string,
  relPath: string,
  status: "added" | "removed" | "changed"
): FileExplanation {
  if (status === "added") {
    return {
      file: relPath,
      status,
      changes: [{ kind: "added", path: relPath }],
      truncated: false,
    };
  }

  if (status === "removed") {
    return {
      file: relPath,
      status,
      changes: [{ kind: "removed", path: relPath }],
      truncated: false,
    };
  }

  const beforeContent = readFileFromGit(projectDir, baselineCommit, relPath);
  const afterContent = readFileIfExists(join(projectDir, relPath));

  if (!beforeContent || !afterContent) {
    return {
      file: relPath,
      status,
      changes: [
        {
          kind: "changed",
          path: relPath,
          before: beforeContent ? "available" : "missing from baseline",
          after: afterContent ? "available" : "missing from working tree",
        },
      ],
      truncated: false,
    };
  }

  try {
    const beforeDoc = parseSpecDocument(relPath, beforeContent);
    const afterDoc = parseSpecDocument(relPath, afterContent);
    const changes: SemanticChange[] = [];
    compareSemanticValue("", beforeDoc, afterDoc, changes);

    return {
      file: relPath,
      status,
      changes,
      truncated: changes.length >= MAX_CHANGES_PER_FILE,
    };
  } catch (error) {
    return {
      file: relPath,
      status,
      changes: [
        {
          kind: "changed",
          path: relPath,
          after: error instanceof Error ? error.message : "unable to parse file diff",
        },
      ],
      truncated: false,
    };
  }
}

export function explainDrift(projectDir: string, result: CheckResult): ExplainResult {
  const baseline = result.state.baseline;
  if (!baseline?.commit) {
    return {
      available: false,
      note: "No git baseline metadata found in snapshot. Re-run `openuispec drift --snapshot --target <target>` from a git checkout.",
      files: [],
    };
  }

  if (baseline.kind !== "git_commit") {
    return {
      available: false,
      note: "Snapshot was created from a dirty working tree, so semantic diff cannot reconstruct the exact baseline. Re-snapshot from a clean commit for precise explanations.",
      files: [],
    };
  }

  const files: FileExplanation[] = [];
  for (const relPath of result.drift.added) {
    files.push(explainFileChange(projectDir, baseline.commit, relPath, "added"));
  }
  for (const relPath of result.drift.removed) {
    files.push(explainFileChange(projectDir, baseline.commit, relPath, "removed"));
  }
  for (const relPath of result.drift.changed) {
    files.push(explainFileChange(projectDir, baseline.commit, relPath, "changed"));
  }

  files.sort((a, b) => a.file.localeCompare(b.file));
  return { available: true, files };
}

// ── project resolution ───────────────────────────────────────────────

/** Find the spec project directory by looking for openuispec.yaml. */
export function findProjectDir(cwd: string): string {
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
  throw new Error(
    "No openuispec.yaml found. " +
      "Run from a directory containing openuispec.yaml or an openuispec/ subdirectory."
  );
}

/** Read and parse the manifest YAML. */
export function readManifest(projectDir: string): Record<string, any> {
  return YAML.parse(readFileSync(join(projectDir, "openuispec.yaml"), "utf-8"));
}

/** Read the project name from the manifest. */
export function readProjectName(projectDir: string): string {
  const doc = readManifest(projectDir);
  return doc.project?.name ?? basename(projectDir);
}

/** Read per-target output_dir map from the manifest. */
export function readOutputDirs(projectDir: string): Record<string, string> {
  try {
    const doc = YAML.parse(readFileSync(join(projectDir, "openuispec.yaml"), "utf-8"));
    return doc.generation?.output_dir ?? {};
  } catch {
    return {};
  }
}

/** Resolve the generated output directory for a target. */
export function resolveOutputDir(projectDir: string, projectName: string, target: string): string {
  const outputDirs = readOutputDirs(projectDir);
  if (outputDirs[target]) {
    return resolve(projectDir, outputDirs[target]);
  }
  // Default: generated/<target>/<project_name> relative to cwd
  return resolve(projectDir, "..", "generated", target, projectName);
}

export function stateFilePath(projectDir: string, projectName: string, target: string): string {
  return join(resolveOutputDir(projectDir, projectName, target), STATE_FILE);
}

function missingSnapshotMessage(
  cwd: string,
  projectDir: string,
  projectName: string,
  target: string
): string {
  const outDir = resolveOutputDir(projectDir, projectName, target);
  if (!existsSync(outDir)) {
    return (
      `No snapshot found for target "${target}".\n` +
      `Output directory not found: ${relative(cwd, outDir)}\n` +
      `Run code generation for "${target}" first, then run: openuispec drift --snapshot --target ${target}`
    );
  }
  return (
    `No snapshot found for target "${target}".\n` +
    `Run: openuispec drift --snapshot --target ${target}`
  );
}

export function discoverTargets(projectDir: string, projectName: string): string[] {
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

export interface SnapshotResult {
  target: string;
  snapshot_at: string;
  files_hashed: number;
  stubs: number;
  state_path: string;
  baseline: string | null;
}

export function createSnapshot(cwd: string, target: string): SnapshotResult {
  const projectDir = findProjectDir(cwd);
  const projectName = readProjectName(projectDir);
  const outDir = resolveOutputDir(projectDir, projectName, target);
  if (!existsSync(outDir)) {
    throw new Error(
      `Output directory not found: ${relative(cwd, outDir)}\n` +
        `Run code generation for "${target}" first.`
    );
  }

  const manifest = readManifest(projectDir);
  const files = discoverSpecFiles(projectDir);
  const baseline = captureBaseline(projectDir, files);

  const entries: Record<string, FileEntry> = {};
  let stubCount = 0;

  for (const f of files) {
    const rel = relative(projectDir, f);
    const status = hasStatusSemantics(rel) ? readStatus(f) : "ready";
    entries[rel] = { hash: hashFile(f), status };
    if (status === "stub") stubCount++;
  }

  const state: StateFile = {
    spec_version: manifest.spec_version ?? "0.1",
    snapshot_at: new Date().toISOString(),
    target,
    baseline,
    files: entries,
  };

  const outPath = stateFilePath(projectDir, projectName, target);
  writeFileSync(outPath, JSON.stringify(state, null, 2) + "\n");

  return {
    target,
    snapshot_at: state.snapshot_at,
    files_hashed: Object.keys(entries).length,
    stubs: stubCount,
    state_path: relative(cwd, outPath),
    baseline: formatBaseline(baseline),
  };
}

function snapshot(cwd: string, projectDir: string, target: string): void {
  try {
    const result = createSnapshot(cwd, target);
    console.log(`Snapshot saved: ${result.state_path}`);
    console.log(`  ${result.files_hashed} files hashed`);
    if (result.stubs > 0) {
      console.log(`  ${result.stubs} stubs (not tracked for drift)`);
    }
    console.log(`  target: ${result.target}`);
    if (result.baseline) {
      console.log(`  baseline: ${result.baseline}`);
    }
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

// ── check ─────────────────────────────────────────────────────────────

export interface CheckResult {
  state: StateFile;
  drift: DriftResult;
  stubDrift: DriftResult;
  statuses: Record<string, string>;
  explanation?: ExplainResult;
}

export function computeDrift(
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

export function loadTargetDrift(
  cwd: string,
  target: string,
  includeAll: boolean,
  explainOutput: boolean
): { projectDir: string; projectName: string; statePath: string; result: CheckResult } {
  const projectDir = findProjectDir(cwd);
  const projectName = readProjectName(projectDir);
  const statePath = stateFilePath(projectDir, projectName, target);
  if (!existsSync(statePath)) {
    throw new Error(missingSnapshotMessage(cwd, projectDir, projectName, target));
  }

  const state: StateFile = JSON.parse(readFileSync(statePath, "utf-8"));
  const result = computeDrift(projectDir, state, includeAll);
  if (explainOutput) {
    result.explanation = explainDrift(projectDir, result);
  }

  return { projectDir, projectName, statePath, result };
}

function check(
  cwd: string,
  projectDir: string,
  target: string,
  jsonOutput: boolean,
  includeAll: boolean,
  explainOutput: boolean
): void {
  const { result } = loadTargetDrift(cwd, target, includeAll, explainOutput);

  if (jsonOutput) {
    printJson(result);
  } else {
    printReport(projectDir, result);
  }

  const d = result.drift;
  const hasDrift = d.changed.length > 0 || d.added.length > 0 || d.removed.length > 0;
  process.exit(hasDrift ? 2 : 0);
}

function checkAll(
  cwd: string,
  projectDir: string,
  jsonOutput: boolean,
  includeAll: boolean,
  explainOutput: boolean
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
    if (explainOutput) {
      result.explanation = explainDrift(projectDir, result);
    }

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

  process.exit(anyDrift ? 2 : 0);
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
        baseline: result.state.baseline,
        ...result.drift,
        explanation: result.explanation,
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
  const baselineLabel = formatBaseline(result.state.baseline);
  if (baselineLabel) {
    console.log(`Baseline: ${baselineLabel}`);
  }

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

  if (result.explanation) {
    console.log("\nSemantic Changes");
    console.log("----------------");

    if (!result.explanation.available) {
      console.log(result.explanation.note ?? "Semantic explanation unavailable.");
      return;
    }

    if (result.explanation.files.length === 0) {
      console.log("No semantic changes to explain.");
      return;
    }

    for (const file of result.explanation.files) {
      console.log(`\n${file.file}`);
      if (file.changes.length === 0) {
        console.log("  · no property-level changes detected");
        continue;
      }

      for (const change of file.changes) {
        const pathLabel = change.path || "(root)";
        if (change.kind === "added") {
          const value = change.after ? ` = ${change.after}` : "";
          console.log(`  + ${pathLabel}${value}`);
        } else if (change.kind === "removed") {
          const value = change.before ? ` (was ${change.before})` : "";
          console.log(`  - ${pathLabel}${value}`);
        } else {
          console.log(`  ~ ${pathLabel}: ${change.before ?? "?"} -> ${change.after ?? "?"}`);
        }
      }

      if (file.truncated) {
        console.log(`  … truncated after ${MAX_CHANGES_PER_FILE} changes`);
      }
    }
  }
}

// ── main ──────────────────────────────────────────────────────────────

export function runDrift(argv: string[]): void {
  const isSnapshot = argv.includes("--snapshot");
  const isJson = argv.includes("--json");
  const includeAll = argv.includes("--all");
  const explainOutput = argv.includes("--explain");

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
    check(cwd, projectDir, target, isJson, includeAll, explainOutput);
  } else {
    checkAll(cwd, projectDir, isJson, includeAll, explainOutput);
  }
}

// Direct execution
const isDirectRun =
  process.argv[1]?.endsWith("drift/index.ts") ||
  process.argv[1]?.endsWith("drift/index.js");

if (isDirectRun) {
  runDrift(process.argv.slice(2));
}
