#!/usr/bin/env tsx
/**
 * Cross-target status summary for OpenUISpec projects.
 *
 * Usage:
 *   openuispec status             # summarize every target
 *   openuispec status --json      # machine-readable output
 */

import { existsSync } from "node:fs";
import {
  computeDrift,
  discoverTargets,
  explainDrift,
  findProjectDir,
  formatBaseline,
  readOutputDirs,
  readProjectName,
  resolveOutputDir,
  stateFilePath,
  type StateFile,
} from "../drift/index.js";

import { readFileSync } from "node:fs";

interface TargetStatus {
  target: string;
  output_dir: string;
  output_exists: boolean;
  snapshot: boolean;
  snapshot_at: string | null;
  baseline: {
    kind: string | null;
    commit: string | null;
    branch: string | null;
    label: string | null;
  };
  changed: number;
  added: number;
  removed: number;
  behind: boolean;
  explain_available: boolean;
  status: "up to date" | "behind" | "needs baseline" | "needs generation";
  recommended_next_step: string;
  note?: string;
}

export interface StatusResult {
  project: string;
  targets: TargetStatus[];
}

function configuredTargets(projectDir: string): string[] {
  try {
    const manifest = readOutputDirs(projectDir);
    const keys = Object.keys(manifest);
    if (keys.length > 0) return keys.sort();
  } catch {
    // ignore
  }

  // Fallback to common targets when manifest output_dir is absent.
  return ["android", "ios", "web"];
}

function allTargets(projectDir: string, projectName: string): string[] {
  const seen = new Set<string>(configuredTargets(projectDir));
  for (const target of discoverTargets(projectDir, projectName)) {
    seen.add(target);
  }
  return Array.from(seen).sort();
}

function readState(statePath: string): StateFile {
  return JSON.parse(readFileSync(statePath, "utf-8")) as StateFile;
}

function buildTargetStatus(cwd: string, projectDir: string, projectName: string, target: string): TargetStatus {
  const outputDir = resolveOutputDir(projectDir, projectName, target);
  const outputExists = existsSync(outputDir);
  const path = stateFilePath(projectDir, projectName, target);

  if (!existsSync(path)) {
    return {
      target,
      output_dir: outputDir,
      output_exists: outputExists,
      snapshot: false,
      snapshot_at: null,
      baseline: {
        kind: null,
        commit: null,
        branch: null,
        label: null,
      },
      changed: 0,
      added: 0,
      removed: 0,
      behind: false,
      explain_available: false,
      status: outputExists ? "needs baseline" : "needs generation",
      recommended_next_step: outputExists
        ? `Review the generated output, then run \`openuispec drift --snapshot --target ${target}\` to create the baseline.`
        : `Run code generation for "${target}", then \`openuispec prepare --target ${target}\` to build the target work bundle.`,
      note: outputExists
        ? "Baseline pending — generated code exists but user has not yet confirmed it with a snapshot."
        : `Output directory not found. Run code generation for "${target}" first.`,
    };
  }

  const state = readState(path);
  const result = computeDrift(projectDir, state, false);
  const explanation = explainDrift(projectDir, result);
  const changed = result.drift.changed.length;
  const added = result.drift.added.length;
  const removed = result.drift.removed.length;

  return {
    target,
    output_dir: outputDir,
    output_exists: outputExists,
    snapshot: true,
    snapshot_at: state.snapshot_at,
    baseline: {
      kind: state.baseline?.kind ?? null,
      commit: state.baseline?.commit ?? null,
      branch: state.baseline?.branch ?? null,
      label: formatBaseline(state.baseline),
    },
    changed,
    added,
    removed,
    behind: changed + added + removed > 0,
    explain_available: explanation.available,
    status: changed + added + removed > 0 ? "behind" : "up to date",
    recommended_next_step:
      changed + added + removed > 0
        ? `Run \`openuispec prepare --target ${target}\` to build the target work bundle for the pending spec changes.`
        : `No immediate action required for "${target}". Re-run \`openuispec status\` after spec changes or after re-baselining.`,
    note: explanation.available ? undefined : explanation.note,
  };
}

export function buildStatusResult(cwd: string = process.cwd()): StatusResult {
  const projectDir = findProjectDir(cwd);
  const projectName = readProjectName(projectDir);
  const targets = allTargets(projectDir, projectName).map((target) =>
    buildTargetStatus(cwd, projectDir, projectName, target)
  );

  return {
    project: projectName,
    targets,
  };
}

function printReport(result: StatusResult): void {
  console.log("OpenUISpec Status");
  console.log("=================");
  console.log(`Project: ${result.project}`);
  console.log("");

  for (const target of result.targets) {
    const summary = target.snapshot
      ? `${target.changed} changed, ${target.added} added, ${target.removed} removed`
      : target.output_exists
        ? "no snapshot"
        : "output missing";
    console.log(`${target.target}`);
    console.log(`  output: ${target.output_dir}`);
    console.log(`  output exists: ${target.output_exists ? "yes" : "no"}`);
    console.log(`  snapshot: ${target.snapshot ? target.snapshot_at : "missing"}`);
    if (target.baseline.label) {
      console.log(`  baseline: ${target.baseline.label}`);
    }
    console.log(`  drift: ${summary}`);
    console.log(`  status: ${target.status}`);
    console.log(`  explain: ${target.explain_available ? "available" : "unavailable"}`);
    if (target.note) {
      console.log(`  note: ${target.note}`);
    }
    console.log(`  next: ${target.recommended_next_step}`);
    console.log("");
  }
}

export function runStatus(argv: string[]): void {
  const isJson = argv.includes("--json");
  const result = buildStatusResult(process.cwd());

  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  printReport(result);
}

const isDirectRun =
  process.argv[1]?.endsWith("status/index.ts") ||
  process.argv[1]?.endsWith("status/index.js");

if (isDirectRun) {
  runStatus(process.argv.slice(2));
}
