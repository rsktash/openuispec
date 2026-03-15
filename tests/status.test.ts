import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const repoRoot = "/Users/rustam/Projects/openuispec";
const tsxBin = join(repoRoot, "node_modules", ".bin", "tsx");
const driftScript = join(repoRoot, "drift", "index.ts");
const statusScript = join(repoRoot, "status", "index.ts");

function run(cwd: string, command: string, args: string[]): string {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

test("status summarizes target baselines and behind state", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-status-"));

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

    const output = run(sandbox, tsxBin, [statusScript, "--json"]);
    const status = JSON.parse(output);

    const web = status.targets.find((entry: any) => entry.target === "web");
    assert.ok(web);
    assert.equal(web.snapshot, true);
    assert.equal(web.behind, true);
    assert.equal(web.changed, 1);
    assert.equal(web.explain_available, true);

    const android = status.targets.find((entry: any) => entry.target === "android");
    assert.ok(android);
    assert.equal(android.snapshot, false);
    assert.equal(android.note, "No snapshot found for this target.");
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
