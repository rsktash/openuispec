import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tsxBin = join(repoRoot, "node_modules", ".bin", "tsx");
const driftScript = join(repoRoot, "drift", "index.ts");
const prepareScript = join(repoRoot, "prepare", "index.ts");

function run(
  cwd: string,
  command: string,
  args: string[],
  options?: { allowFailure?: boolean }
): string {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    if (options?.allowFailure && error instanceof Error && "stdout" in error) {
      return String((error as any).stdout ?? "");
    }
    throw error;
  }
}

test("drift --explain and prepare describe target work from baseline spec changes", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-prepare-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    cpSync(
      join(repoRoot, "examples", "todo-orbit", "generated", "web", "Todo Orbit"),
      join(sandbox, "generated", "web", "Todo Orbit"),
      { recursive: true }
    );

    run(sandbox, "git", ["init"]);
    run(sandbox, "git", ["config", "user.email", "tests@openuispec.local"]);
    run(sandbox, "git", ["config", "user.name", "OpenUISpec Tests"]);
    run(sandbox, "git", ["add", "openuispec", "generated"]);
    run(sandbox, "git", ["commit", "-m", "baseline"]);

    run(sandbox, tsxBin, [driftScript, "--snapshot", "--target", "web"]);

    const specFile = join(sandbox, "openuispec", "screens", "task_detail.yaml");
    const updated = readFileSync(specFile, "utf-8").replace(
      'title: "$t:task_detail.title"',
      'title: "$t:task_detail.more_info"'
    );
    writeFileSync(specFile, updated);

    const explainOutput = run(
      sandbox,
      tsxBin,
      [driftScript, "--target", "web", "--explain"],
      { allowFailure: true }
    );

    assert.match(explainOutput, /task_detail\.title/);
    assert.match(explainOutput, /\$t:task_detail\.title/);
    assert.match(explainOutput, /\$t:task_detail\.more_info/);

    const prepareOutput = run(sandbox, tsxBin, [prepareScript, "--target", "web", "--json"]);
    const prepared = JSON.parse(prepareOutput);

    assert.equal(prepared.summary.changed, 1);
    assert.equal(prepared.items[0].spec_file, "screens/task_detail.yaml");
    assert.equal(prepared.items[0].semantic_changes[0].path, "task_detail.title");
    assert.ok(prepared.items[0].likely_files.includes("src/App.tsx"));
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
