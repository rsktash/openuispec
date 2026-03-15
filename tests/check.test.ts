import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

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
