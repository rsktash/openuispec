import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const nodeBin = process.execPath;
const tsxLoader = join(repoRoot, "node_modules", "tsx", "dist", "loader.mjs");
const validateScript = join(repoRoot, "schema", "validate.ts");

function runValidate(cwd: string, args: string[], allowFailure = false): string {
  try {
    return execFileSync(nodeBin, ["--import", tsxLoader, validateScript, ...args], {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    if (allowFailure && error instanceof Error && "stdout" in error) {
      const failed = error as any;
      return `${String(failed.stdout ?? "")}${String(failed.stderr ?? "")}`;
    }
    throw error;
  }
}

test("semantic validate catches broken cross references", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-semantic-"));

  try {
    cpSync(join(repoRoot, "examples", "taskflow"), sandbox, { recursive: true });

    const screenPath = join(sandbox, "openuispec", "screens", "home.yaml");
    let content = readFileSync(screenPath, "utf-8");
    content = content
      .replace("$t:nav.tasks", "$t:nav.missing")
      .replace("format:greeting", "format:missing_formatter")
      .replace("map:priority_to_severity", "map:missing_mapper")
      .replace('item_contract: action_trigger', "item_contract: missing_contract")
      .replace('endpoint: "api.tasks.toggleStatus"', 'endpoint: "api.tasks.missing"')
      .replace('destination: "screens/task_detail"', 'destination: "screens/missing"')
      .replace('icon: "plus"', 'icon: "missing_icon"')
      .replace('shadow: "elevation.lg"', 'shadow: "elevation.missing"');
    writeFileSync(screenPath, content);

    const output = runValidate(sandbox, ["semantic"], true);

    assert.match(output, /locale key "nav\.missing"/);
    assert.match(output, /unknown formatter "missing_formatter"/);
    assert.match(output, /unknown mapper "missing_mapper"/);
    assert.match(output, /unknown contract "missing_contract"/);
    assert.match(output, /unknown API reference "api\.tasks\.missing"/);
    assert.match(output, /unknown screen destination "screens\/missing"/);
    assert.match(output, /unknown icon "missing_icon"/);
    assert.match(output, /unknown token reference "elevation\.missing"/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("semantic validate requires backend code root when api endpoints are declared", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-semantic-backend-root-"));

  try {
    cpSync(join(repoRoot, "examples", "taskflow"), sandbox, { recursive: true });

    const manifestPath = join(sandbox, "openuispec", "openuispec.yaml");
    const content = readFileSync(manifestPath, "utf-8").replace(
      /  code_roots:\n    backend: "\.\.\/backend\/"\n/,
      ""
    );
    writeFileSync(manifestPath, content);

    const output = runValidate(sandbox, ["semantic"], true);
    assert.match(output, /generation\.code_roots\.backend/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
