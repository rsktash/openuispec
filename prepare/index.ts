#!/usr/bin/env tsx
/**
 * AI preparation bundle for OpenUISpec projects.
 *
 * Usage:
 *   openuispec prepare --target ios         # AI-ready work bundle for ios
 *   openuispec prepare --target web --json  # machine-readable output
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import YAML from "yaml";
import {
  loadTargetDrift,
  resolveOutputDir,
  type FileExplanation,
  type ExplainResult,
  type SemanticChange,
} from "../drift/index.js";

interface PrepareItem {
  spec_file: string;
  category: string;
  status: "added" | "removed" | "changed";
  semantic_changes: SemanticChange[];
  likely_files: string[];
  notes: string[];
}

interface PrepareResult {
  project: string;
  target: string;
  output_dir: string;
  code_roots: string[];
  baseline: {
    kind: string | null;
    commit: string | null;
    branch: string | null;
  };
  summary: {
    changed: number;
    added: number;
    removed: number;
  };
  changes_available: boolean;
  explanation_note?: string;
  items: PrepareItem[];
  next_steps: string[];
}

function readManifest(projectDir: string): Record<string, any> {
  return YAML.parse(readFileSync(join(projectDir, "openuispec.yaml"), "utf-8"));
}

function categorizeSpecFile(relPath: string): string {
  if (relPath === "openuispec.yaml") return "manifest";
  const group = relPath.split("/")[0];
  return group || "other";
}

function suggestCodeRoots(target: string, outputDir: string): string[] {
  const candidates: string[] = [];

  if (target === "web") {
    candidates.push(join(outputDir, "src"), outputDir);
  } else if (target === "ios") {
    candidates.push(join(outputDir, "Sources"), join(outputDir, "Resources"), outputDir);
  } else if (target === "android") {
    candidates.push(
      join(outputDir, "app", "src", "main", "java"),
      join(outputDir, "app", "src", "main", "kotlin"),
      join(outputDir, "app", "src", "main", "res"),
      outputDir
    );
  } else {
    candidates.push(outputDir);
  }

  const seen = new Set<string>();
  return candidates
    .map((candidate) => resolve(candidate))
    .filter((candidate) => existsSync(candidate))
    .filter((candidate) => {
      if (seen.has(candidate)) return false;
      seen.add(candidate);
      return true;
    });
}

function walkFiles(root: string, files: string[], depth = 0): void {
  if (depth > 8) return;

  for (const entry of readdirSync(root)) {
    if (
      entry === ".git" ||
      entry === "node_modules" ||
      entry === "build" ||
      entry === "dist" ||
      entry === ".gradle" ||
      entry === "DerivedData"
    ) {
      continue;
    }

    const fullPath = join(root, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      walkFiles(fullPath, files, depth + 1);
      continue;
    }

    files.push(fullPath);
  }
}

function isSearchableFile(filePath: string): boolean {
  if (basename(filePath) === ".openuispec-state.json") return false;
  const ext = extname(filePath).toLowerCase();
  return new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".swift",
    ".kt",
    ".kts",
    ".xml",
    ".css",
    ".scss",
    ".md",
    ".plist",
    ".yaml",
    ".yml",
    ".strings",
  ]).has(ext);
}

function normalizeTerm(term: string): string | null {
  const normalized = term.toLowerCase().replace(/[^a-z0-9._/-]+/g, "").trim();
  if (!normalized || normalized.length < 3) return null;
  if (["type", "props", "layout", "children", "title", "body", "root"].includes(normalized)) {
    return null;
  }
  return normalized;
}

function buildSearchTerms(file: FileExplanation): string[] {
  const terms = new Set<string>();
  const stem = basename(file.file, extname(file.file));
  const baseTerms = [
    stem,
    stem.replace(/_/g, ""),
    stem.replace(/_/g, "."),
  ];

  for (const term of baseTerms) {
    const normalized = normalizeTerm(term);
    if (normalized) terms.add(normalized);
  }

  for (const change of file.changes) {
    for (const part of change.path.split(/[.[\]/]+/)) {
      const normalized = normalizeTerm(part);
      if (normalized) terms.add(normalized);
    }
    const normalizedPath = normalizeTerm(change.path);
    if (normalizedPath) terms.add(normalizedPath);
  }

  return Array.from(terms).sort((a, b) => b.length - a.length);
}

function searchLikelyFiles(outputDir: string, codeRoots: string[], file: FileExplanation): string[] {
  const terms = buildSearchTerms(file);
  if (terms.length === 0) return [];

  const candidates: string[] = [];
  for (const root of codeRoots) {
    walkFiles(root, candidates);
  }

  const scored = candidates
    .filter(isSearchableFile)
    .map((candidate) => {
      const relPath = relative(outputDir, candidate);
      const pathScore = terms.reduce((sum, term) => sum + (relPath.toLowerCase().includes(term) ? 5 : 0), 0);

      let contentScore = 0;
      if (pathScore > 0 || terms.some((term) => term.includes("."))) {
        try {
          const text = readFileSync(candidate, "utf-8").toLowerCase();
          contentScore = terms.reduce((sum, term) => sum + (text.includes(term) ? 2 : 0), 0);
        } catch {
          contentScore = 0;
        }
      }

      return { relPath, score: pathScore + contentScore };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.relPath.localeCompare(b.relPath))
    .slice(0, 12);

  const unique = new Set<string>();
  const results: string[] = [];
  for (const entry of scored) {
    if (unique.has(entry.relPath)) continue;
    unique.add(entry.relPath);
    results.push(entry.relPath);
    if (results.length >= 6) break;
  }

  return results;
}

function buildCategoryNotes(category: string, target: string): string[] {
  switch (category) {
    case "screens":
      return ["Update the target screen/view implementation and any matching navigation title or route shell."];
    case "flows":
      return ["Update target flow wiring, sheet/modal presentation, and action handlers for this flow."];
    case "locales":
      return ["Update target localization resources so new or changed locale keys are available at runtime."];
    case "tokens":
      return ["Update target theme, style, or shared visual tokens if the spec change affects appearance or spacing semantics."];
    case "contracts":
      return ["Update shared target primitives/renderers that realize this contract family."];
    case "platform":
      return [`Update ${target}-specific shell, navigation, or platform override behavior.`];
    case "manifest":
      return ["Recheck app shell, routing, data wiring, and generation target assumptions from the project manifest."];
    default:
      return ["Review the semantic diff and update the target implementation accordingly."];
  }
}

function explanationItems(
  explanation: ExplainResult | undefined,
  outputDir: string,
  codeRoots: string[],
  target: string
): PrepareItem[] {
  if (!explanation?.available) return [];

  return explanation.files.map((file) => ({
    spec_file: file.file,
    category: categorizeSpecFile(file.file),
    status: file.status,
    semantic_changes: file.changes,
    likely_files: searchLikelyFiles(outputDir, codeRoots, file),
    notes: buildCategoryNotes(categorizeSpecFile(file.file), target),
  }));
}

function printReport(result: PrepareResult): void {
  console.log("OpenUISpec Prepare");
  console.log("==================");
  console.log(`Project: ${result.project}`);
  console.log(`Target: ${result.target}`);
  console.log(`Output: ${result.output_dir}`);
  if (result.baseline.commit) {
    const shortCommit = result.baseline.commit.slice(0, 12);
    const branch = result.baseline.branch ? ` on ${result.baseline.branch}` : "";
    console.log(`Baseline: ${shortCommit}${branch} (${result.baseline.kind ?? "unknown"})`);
  }

  console.log(
    `Summary: ${result.summary.changed} changed, ${result.summary.added} added, ${result.summary.removed} removed`
  );

  if (!result.changes_available) {
    console.log(`\n${result.explanation_note ?? "No semantic changes available."}`);
  } else if (result.items.length === 0) {
    console.log("\nNo target updates are currently required from spec drift.");
  } else {
    console.log("\nCode Roots");
    for (const root of result.code_roots) {
      console.log(`  - ${root}`);
    }

    console.log("\nWork Items");
    for (const item of result.items) {
      console.log(`\n${item.spec_file}`);
      for (const change of item.semantic_changes) {
        const pathLabel = change.path || "(root)";
        if (change.kind === "added") {
          console.log(`  + ${pathLabel}${change.after ? ` = ${change.after}` : ""}`);
        } else if (change.kind === "removed") {
          console.log(`  - ${pathLabel}${change.before ? ` (was ${change.before})` : ""}`);
        } else {
          console.log(`  ~ ${pathLabel}: ${change.before ?? "?"} -> ${change.after ?? "?"}`);
        }
      }

      if (item.likely_files.length > 0) {
        console.log("  likely target files:");
        for (const file of item.likely_files) {
          console.log(`    - ${file}`);
        }
      }

      for (const note of item.notes) {
        console.log(`  note: ${note}`);
      }
    }
  }

  console.log("\nNext Steps");
  for (const step of result.next_steps) {
    console.log(`  - ${step}`);
  }
}

function buildPrepareResult(target: string): PrepareResult {
  const cwd = process.cwd();
  const { projectDir, projectName, result } = loadTargetDrift(cwd, target, false, true);
  const outputDir = resolveOutputDir(projectDir, projectName, target);
  const codeRoots = suggestCodeRoots(target, outputDir);
  const manifest = readManifest(projectDir);
  const outputFormat = manifest.generation?.output_format?.[target] ?? {};
  const items = explanationItems(result.explanation, outputDir, codeRoots, target);

  const nextSteps = [
    `Update the ${target} implementation in ${outputDir} to match the semantic changes above.`,
    "Build or run the target and review the affected screens/flows.",
    `After the UI is updated, run \`openuispec drift --snapshot --target ${target}\` to accept the new baseline.`,
    `Run \`openuispec drift --target ${target} --explain\` again to confirm no spec changes remain for this target.`,
  ];

  if (outputFormat.framework || outputFormat.language) {
    nextSteps.unshift(
      `Target mapping context: ${outputFormat.language ?? "unknown language"} / ${outputFormat.framework ?? "unknown framework"}.`
    );
  }

  return {
    project: projectName,
    target,
    output_dir: outputDir,
    code_roots: codeRoots,
    baseline: {
      kind: result.state.baseline?.kind ?? null,
      commit: result.state.baseline?.commit ?? null,
      branch: result.state.baseline?.branch ?? null,
    },
    summary: {
      changed: result.drift.changed.length,
      added: result.drift.added.length,
      removed: result.drift.removed.length,
    },
    changes_available: result.explanation?.available ?? false,
    explanation_note: result.explanation?.note,
    items,
    next_steps: nextSteps,
  };
}

export function runPrepare(argv: string[]): void {
  const isJson = argv.includes("--json");
  const targetIdx = argv.indexOf("--target");
  const target = targetIdx !== -1 && argv[targetIdx + 1] ? argv[targetIdx + 1] : null;

  if (!target) {
    console.error("Error: --target is required for prepare");
    console.error("Usage: openuispec prepare --target <target> [--json]");
    process.exit(1);
  }

  const result = buildPrepareResult(target);
  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  printReport(result);
}

const isDirectRun =
  process.argv[1]?.endsWith("prepare/index.ts") ||
  process.argv[1]?.endsWith("prepare/index.js");

if (isDirectRun) {
  runPrepare(process.argv.slice(2));
}
