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
const driftScript = join(repoRoot, "drift", "index.ts");
const statusScript = join(repoRoot, "status", "index.ts");

function tsxArgs(script: string, args: string[]): string[] {
  return ["--import", tsxLoader, script, ...args];
}

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
    mkdirSync(join(sandbox, "generated", "android", "Todo Orbit"), { recursive: true });

    run(sandbox, "git", ["init"]);
    run(sandbox, "git", ["config", "user.email", "tests@openuispec.local"]);
    run(sandbox, "git", ["config", "user.name", "OpenUISpec Tests"]);
    run(sandbox, "git", ["add", "openuispec", "generated"]);
    run(sandbox, "git", ["commit", "-m", "baseline"]);

    run(sandbox, nodeBin, tsxArgs(driftScript, ["--snapshot", "--target", "web"]));

    const specFile = join(sandbox, "openuispec", "screens", "task_detail.yaml");
    const updated = readFileSync(specFile, "utf-8").replace(
      'title: "$t:task_detail.title"',
      'title: "$t:task_detail.more_info"'
    );
    writeFileSync(specFile, updated);

    const output = run(sandbox, nodeBin, tsxArgs(statusScript, ["--json"]));
    const status = JSON.parse(output);

    const web = status.targets.find((entry: any) => entry.target === "web");
    assert.ok(web);
    assert.equal(web.snapshot, true);
    assert.equal(web.behind, true);
    assert.equal(web.status, "behind");
    assert.equal(web.changed, 1);
    assert.equal(web.explain_available, true);
    assert.match(web.recommended_next_step, /openuispec prepare --target web/);

    const android = status.targets.find((entry: any) => entry.target === "android");
    assert.ok(android);
    assert.equal(android.output_exists, true);
    assert.equal(android.snapshot, false);
    assert.equal(android.status, "needs baseline");
    assert.equal(android.note, "Baseline pending — generated code exists but user has not yet confirmed it with a snapshot.");
    assert.match(android.recommended_next_step, /openuispec drift --snapshot --target android/);

    const ios = status.targets.find((entry: any) => entry.target === "ios");
    assert.ok(ios);
    assert.equal(ios.output_exists, false);
    assert.equal(ios.snapshot, false);
    assert.equal(ios.status, "needs generation");
    assert.equal(ios.note, 'Output directory not found. Run code generation for "ios" first.');
    assert.match(ios.recommended_next_step, /openuispec prepare --target ios/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("status includes shared layer info when configured", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-status-shared-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    cpSync(
      join(repoRoot, "examples", "todo-orbit", "generated", "web", "Todo Orbit"),
      join(sandbox, "generated", "ios", "Todo Orbit"),
      { recursive: true }
    );

    // Add shared layer config (insert under generation block, before generation_guidance)
    const manifestPath = join(sandbox, "openuispec", "openuispec.yaml");
    const manifest = readFileSync(manifestPath, "utf-8");
    writeFileSync(
      manifestPath,
      manifest.replace(
        "\ngeneration_guidance:",
        `\n  shared:\n    mobile_common:\n      platforms: [ios, android]\n      language: kotlin\n      root: "../kmp-shared"\n      tracks: [manifest, contracts]\n      scope: \"Shared business logic.\"\n\ngeneration_guidance:`
      )
    );

    mkdirSync(join(sandbox, "kmp-shared"), { recursive: true });

    run(sandbox, "git", ["init"]);
    run(sandbox, "git", ["config", "user.email", "tests@openuispec.local"]);
    run(sandbox, "git", ["config", "user.name", "OpenUISpec Tests"]);
    run(sandbox, "git", ["add", "."]);
    run(sandbox, "git", ["commit", "-m", "baseline"]);

    // Snapshot ios — should auto-create shared layer state
    run(sandbox, nodeBin, tsxArgs(driftScript, ["--snapshot", "--target", "ios"]));

    const output = run(sandbox, nodeBin, tsxArgs(statusScript, ["--json"]));
    const status = JSON.parse(output);

    assert.ok(status.shared_layers, "status should include shared_layers");
    assert.equal(status.shared_layers.length, 1);
    assert.equal(status.shared_layers[0].name, "mobile_common");
    assert.deepEqual(status.shared_layers[0].platforms, ["ios", "android"]);
    assert.equal(status.shared_layers[0].snapshot, true);
    assert.equal(status.shared_layers[0].generated_by_target, "ios");
    assert.equal(status.shared_layers[0].status, "up to date");
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
