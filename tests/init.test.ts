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
    assert.match(output, /--defaults/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("init --defaults scaffolds a non-interactive project with backend root and target stacks", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-init-defaults-"));

  try {
    runInit(sandbox, ["--defaults"]);

    const manifestPath = join(sandbox, "openuispec", "openuispec.yaml");
    const manifest = readFileSync(manifestPath, "utf-8");
    assert.match(manifest, /code_roots:\n\s+backend: "\.\.\/backend\/"/);

    assert.equal(existsSync(join(sandbox, "backend", ".gitkeep")), true);
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

test("init --defaults does not add backend .gitkeep when backend folder already has content", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-init-existing-backend-"));

  try {
    mkdirSync(join(sandbox, "backend"), { recursive: true });
    writeFileSync(join(sandbox, "backend", "server.ts"), "export {};\n");

    runInit(sandbox, ["--defaults"]);

    assert.equal(existsSync(join(sandbox, "backend", "server.ts")), true);
    assert.equal(existsSync(join(sandbox, "backend", ".gitkeep")), false);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
