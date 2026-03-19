import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildAuditResult } from "../check/audit.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const nodeBin = process.execPath;
const tsxLoader = join(repoRoot, "node_modules", "tsx", "dist", "loader.mjs");
const checkScript = join(repoRoot, "check", "index.ts");

function tsxArgs(script: string, args: string[]): string[] {
  return ["--import", tsxLoader, script, ...args];
}

function run(
  cwd: string,
  args: string[],
  options?: { allowFailure?: boolean },
): string {
  try {
    return execFileSync(nodeBin, args, {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    if (options?.allowFailure && error instanceof Error && "stdout" in error) {
      const failed = error as any;
      return `${String(failed.stdout ?? "")}${String(failed.stderr ?? "")}`;
    }
    throw error;
  }
}

test("check --target web --json returns structured JSON with zero validation errors for clean project", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-check-clean-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    mkdirSync(join(sandbox, "backend"), { recursive: true });

    const output = run(
      sandbox,
      tsxArgs(checkScript, ["--target", "web", "--json"]),
      { allowFailure: true },
    );

    const result = JSON.parse(output);

    assert.equal(result.target, "web");
    assert.equal(typeof result.validation, "object");
    assert.equal(result.validation.total_errors, 0, "expected zero schema validation errors");
    assert.equal(typeof result.semantic, "object");
    assert.equal(result.semantic.total_errors, 0, "expected zero semantic errors");
    assert.equal(typeof result.prepare, "object");
    assert.ok(["bootstrap", "update"].includes(result.prepare.mode));
    assert.equal(typeof result.prepare.ready, "boolean");
    assert.ok(Array.isArray(result.prepare.missing));
    assert.ok(Array.isArray(result.prepare.warnings));
    assert.ok(Array.isArray(result.validation.groups));
    assert.ok(result.validation.groups.length > 0);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("check --target web --json returns validation errors for broken project", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-check-broken-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    mkdirSync(join(sandbox, "backend"), { recursive: true });

    // Break a cross-reference in a screen file
    const screenPath = join(sandbox, "openuispec", "screens", "task_detail.yaml");
    let content = readFileSync(screenPath, "utf-8");
    content = content.replace(
      'destination: "screens/home"',
      'destination: "screens/nonexistent_screen"',
    );
    writeFileSync(screenPath, content);

    const output = run(
      sandbox,
      tsxArgs(checkScript, ["--target", "web", "--json"]),
      { allowFailure: true },
    );

    const result = JSON.parse(output);

    assert.equal(result.target, "web");
    assert.ok(
      result.semantic.total_errors > 0,
      "expected semantic errors for broken cross-reference",
    );
    const hasScreenError = result.semantic.errors.some(
      (e: { message: string }) => e.message.includes("nonexistent_screen"),
    );
    assert.ok(hasScreenError, "expected error mentioning nonexistent_screen");
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("check reports missing token files in validation and audit results", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-check-missing-token-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    mkdirSync(join(sandbox, "backend"), { recursive: true });
    unlinkSync(join(sandbox, "openuispec", "tokens", "motion.yaml"));

    const output = run(
      sandbox,
      tsxArgs(checkScript, ["--target", "web", "--audit", "--json"]),
      { allowFailure: true },
    );

    const result = JSON.parse(output);
    const tokenGroup = result.validation.groups.find((group: { group: string }) => group.group === "tokens");
    assert.ok(tokenGroup, "expected tokens validation group");
    assert.ok(
      tokenGroup.errors.some(
        (error: { file: string; message: string }) =>
          error.file === "motion.yaml" && error.message.includes("required token file is missing"),
      ),
      "expected validation error for missing motion.yaml",
    );
    assert.ok(result.validation.total_errors > 0, "expected schema validation failure for missing token file");
    assert.ok(result.audit, "expected audit results");
    assert.ok(
      result.audit.findings.some(
        (finding: { domain: string; rule: string; severity: string; message: string }) =>
          finding.domain === "tokens" &&
          finding.rule === "missing_file" &&
          finding.severity === "error" &&
          finding.message.includes("motion.yaml"),
      ),
      "expected audit finding for missing motion.yaml",
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("audit reports unreadable token yaml files", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-audit-unreadable-token-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    writeFileSync(
      join(sandbox, "openuispec", "tokens", "motion.yaml"),
      "motion:\n  duration:\n    quick: [broken\n"
    );

    const result = buildAuditResult(join(sandbox, "openuispec"));

    assert.ok(
      result.findings.some(
        (finding) =>
          finding.domain === "motion" &&
          finding.rule === "unreadable_file" &&
          finding.severity === "error" &&
          finding.message.includes("motion.yaml"),
      ),
      "expected unreadable_file audit finding for malformed motion.yaml",
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("audit checks semantic color completeness", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-audit-semantic-color-"));
  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), { recursive: true });
    const colorPath = join(sandbox, "openuispec", "tokens", "color.yaml");
    const color = readFileSync(colorPath, "utf-8");
    writeFileSync(colorPath, color.replace(/^\s+danger:[\s\S]*?contrast_min: 4\.5 \}/m, ""));
    const result = buildAuditResult(join(sandbox, "openuispec"));
    assert.ok(
      result.findings.some((f) => f.rule === "semantic_completeness" && f.message.includes("danger")),
      "expected warning for missing danger semantic color",
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("audit checks elevation progression", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-audit-elevation-"));
  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), { recursive: true });
    // Reverse elevation values so sm > md
    const elevPath = join(sandbox, "openuispec", "tokens", "elevation.yaml");
    const elev = readFileSync(elevPath, "utf-8");
    writeFileSync(elevPath, elev.replace("elevation: 1", "elevation: 10").replace("elevation: 6", "elevation: 2"));
    const result = buildAuditResult(join(sandbox, "openuispec"));
    assert.ok(
      result.findings.some((f) => f.rule === "progression" && f.domain === "elevation"),
      "expected warning for non-monotonic elevation",
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("audit checks easing quality", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-audit-easing-"));
  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), { recursive: true });
    const motionPath = join(sandbox, "openuispec", "tokens", "motion.yaml");
    writeFileSync(motionPath, `motion:\n  duration:\n    quick: 180\n    normal: 280\n  easing:\n    default: "ease"\n  reduced_motion: "remove-animation"\n`);
    const result = buildAuditResult(join(sandbox, "openuispec"));
    assert.ok(
      result.findings.some((f) => f.rule === "easing_quality" && f.message.includes("enter")),
      "expected warning for missing enter/exit easing",
    );
    assert.ok(
      result.findings.some((f) => f.rule === "easing_quality" && f.message.includes("cubic-bezier")),
      "expected warning for no cubic-bezier easing",
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("audit checks typography weight hierarchy", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-audit-weight-"));
  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), { recursive: true });
    const typoPath = join(sandbox, "openuispec", "tokens", "typography.yaml");
    const typo = readFileSync(typoPath, "utf-8");
    // Set all weights to 400
    writeFileSync(typoPath, typo.replace(/weight: \d+/g, "weight: 400"));
    const result = buildAuditResult(join(sandbox, "openuispec"));
    assert.ok(
      result.findings.some((f) => f.rule === "weight_hierarchy"),
      "expected warning for single font weight",
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("audit checks layout size class coverage", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-audit-layout-"));
  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), { recursive: true });
    const layoutPath = join(sandbox, "openuispec", "tokens", "layout.yaml");
    writeFileSync(layoutPath, `layout:\n  size_classes:\n    regular:\n      semantic: "Tablet"\n      width: { min: 641, max: 1024 }\n      columns: 8\n`);
    const result = buildAuditResult(join(sandbox, "openuispec"));
    assert.ok(
      result.findings.some((f) => f.rule === "size_class_coverage" && f.message.includes("compact")),
      "expected warning for missing compact size class",
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("audit checks contract state coverage", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-audit-contract-state-"));
  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), { recursive: true });
    // Write a contract with empty must_handle
    writeFileSync(
      join(sandbox, "openuispec", "contracts", "surface.yaml"),
      `surface:\n  semantic: "test"\n  generation:\n    must_handle: []\n`,
    );
    const result = buildAuditResult(join(sandbox, "openuispec"));
    assert.ok(
      result.findings.some((f) => f.rule === "state_coverage" && f.message.includes("surface")),
      "expected warning for contract with empty must_handle",
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("clean project passes all new audit checks without warnings", () => {
  const result = buildAuditResult(join(repoRoot, "examples", "todo-orbit", "openuispec"));
  const newRules = ["semantic_completeness", "level_count", "progression", "easing_quality", "weight_hierarchy", "size_class_coverage", "state_coverage"];
  for (const rule of newRules) {
    assert.ok(
      !result.findings.some((f) => f.rule === rule),
      `clean todo-orbit project should not trigger ${rule}`,
    );
  }
});
