import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const nodeBin = process.execPath;
const tsxLoader = join(repoRoot, "node_modules", "tsx", "dist", "loader.mjs");
const cliScript = join(repoRoot, "cli", "index.ts");

function runInit(cwd: string, args: string[], allowFailure = false): string {
  try {
    return execFileSync(nodeBin, ["--import", tsxLoader, cliScript, "init", ...args], {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (error) {
    if (allowFailure && error instanceof Error && "stdout" in error) {
      const failed = error as any;
      return `${String(failed.stdout ?? "")}${String(failed.stderr ?? "")}`;
    }
    throw error;
  }
}

test("init fails clearly without a tty unless defaults or flags are provided", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-init-notty-"));

  try {
    const output = runInit(sandbox, [], true);
    assert.match(output, /needs a TTY for prompts/);
    assert.match(output, /--list-options/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("init --defaults scaffolds a non-interactive project with backend config and target stacks", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-init-defaults-"));

  try {
    runInit(sandbox, ["--defaults"]);

    const manifestPath = join(sandbox, "openuispec", "openuispec.yaml");
    const manifest = readFileSync(manifestPath, "utf-8");
    assert.match(manifest, /code_roots:\n\s+backend: "\.\.\/backend\/"/);

    // backend folder is NOT created by init — it's the user's responsibility
    assert.equal(existsSync(join(sandbox, "backend")), false);

    assert.equal(existsSync(join(sandbox, "openuispec", "platform", "android.yaml")), true);
    assert.equal(existsSync(join(sandbox, "openuispec", "platform", "ios.yaml")), true);
    assert.equal(existsSync(join(sandbox, "openuispec", "platform", "web.yaml")), true);

    const androidPlatform = readFileSync(join(sandbox, "openuispec", "platform", "android.yaml"), "utf-8");
    assert.match(androidPlatform, /preferences: datastore/);
    assert.match(androidPlatform, /database: none/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("init --defaults --quiet produces minimal output", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-init-quiet-"));

  try {
    const output = runInit(sandbox, ["--defaults", "--quiet"]);

    const lines = output.trim().split("\n").filter((l: string) => l.trim().length > 0);
    assert.equal(lines.length, 1);
    assert.match(lines[0], /\.\/openuispec\//);
    assert.ok(!output.includes("Scaffolding"));
    assert.ok(!output.includes("OpenUISpec — Project Setup"));
    assert.ok(!output.includes("Done!"));
    assert.ok(!output.includes("create "));

    assert.equal(existsSync(join(sandbox, "openuispec", "openuispec.yaml")), true);
    assert.equal(existsSync(join(sandbox, "CLAUDE.md")), true);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("init --defaults --with-shared scaffolds shared layer and structure config", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-init-shared-"));

  try {
    runInit(sandbox, ["--defaults", "--with-shared"]);

    const manifestPath = join(sandbox, "openuispec", "openuispec.yaml");
    const manifest = readFileSync(manifestPath, "utf-8");

    // Shared layer should be present with KMP defaults
    assert.match(manifest, /shared:/);
    assert.match(manifest, /mobile_common:/);
    assert.match(manifest, /platforms: \[ios, android\]/);
    assert.match(manifest, /language: kotlin/);
    assert.match(manifest, /scope: "Business logic/);
    // tracks omitted by default (scope drives AI behavior, tracks is opt-in for drift)
    assert.ok(!manifest.includes("tracks:"));

    // Structure should be present for ios and android
    assert.match(manifest, /structure:/);
    assert.match(manifest, /ios:/);
    assert.match(manifest, /android:/);
    assert.match(manifest, /scope: "Pure SwiftUI/);
    assert.match(manifest, /scope: "Pure Compose/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("init --defaults --with-shared --targets ios produces no shared layer (needs 2 mobile platforms)", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-init-shared-single-"));

  try {
    runInit(sandbox, ["--defaults", "--with-shared", "--targets", "ios"]);

    const manifestPath = join(sandbox, "openuispec", "openuispec.yaml");
    const manifest = readFileSync(manifestPath, "utf-8");

    // No shared layer when only one mobile target
    assert.ok(!manifest.includes("shared:"));
    assert.ok(!manifest.includes("structure:"));
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
