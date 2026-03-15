import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import YAML from "yaml";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const nodeBin = process.execPath;
const tsxLoader = join(repoRoot, "node_modules", "tsx", "dist", "loader.mjs");
const cliScript = join(repoRoot, "cli", "index.ts");

function runConfigure(cwd: string, args: string[], allowFailure = false): string {
  try {
    return execFileSync(nodeBin, ["--import", tsxLoader, cliScript, "configure-target", ...args], {
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

test("configure-target fails clearly without a tty unless defaults are provided", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-configure-target-notty-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });

    const output = runConfigure(sandbox, ["android"], true);
    assert.match(output, /needs a TTY for prompts/);
    assert.match(output, /--defaults/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("configure-target writes default android stack choices into platform yaml", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-configure-target-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    unlinkSync(join(sandbox, "openuispec", "platform", "android.yaml"));

    runConfigure(sandbox, ["android", "--defaults"]);

    const configured = YAML.parse(
      readFileSync(join(sandbox, "openuispec", "platform", "android.yaml"), "utf-8")
    );
    const android = configured.android;

    assert.ok(android);
    assert.equal(android.framework, "compose");
    assert.equal(android.language, "kotlin");
    assert.equal(android.min_sdk, 26);
    assert.equal(android.target_sdk, 35);
    assert.equal(android.generation.architecture, "decompose");
    assert.equal(android.generation.state, "mvikotlin");
    assert.equal(android.generation.preferences, "datastore");
    assert.equal(android.generation.database, "none");
    assert.equal(android.generation.di, "metro");
    assert.deepEqual(android.generation.dependencies, [
      "material3",
      "activity-compose",
      "decompose",
      "decompose-compose",
      "essenty-lifecycle",
      "essenty-instance-keeper",
      "mvikotlin",
      "mvikotlin-main",
      "mvikotlin-logging",
      "datastore-preferences",
      "datastore-core",
      "metro",
      "metro-compose",
    ]);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("configure-target preserves Android preferences and database choices together", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-configure-target-multi-storage-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    writeFileSync(
      join(sandbox, "openuispec", "platform", "android.yaml"),
      YAML.stringify({
        android: {
          framework: "compose",
          language: "kotlin",
          generation: {
            architecture: "decompose",
            state: "mvikotlin",
            preferences: "datastore",
            database: "sqldelight",
            di: "metro",
          },
        },
      })
    );

    runConfigure(sandbox, ["android", "--defaults"]);

    const configured = YAML.parse(
      readFileSync(join(sandbox, "openuispec", "platform", "android.yaml"), "utf-8")
    );
    const android = configured.android;

    assert.equal(android.generation.preferences, "datastore");
    assert.equal(android.generation.database, "sqldelight");
    assert.ok(android.generation.dependencies.includes("datastore-preferences"));
    assert.ok(android.generation.dependencies.includes("datastore-core"));
    assert.ok(android.generation.dependencies.includes("sqldelight"));
    assert.ok(android.generation.dependencies.includes("sqldelight-coroutines"));
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("configure-target preserves custom web framework and stack values under defaults", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-configure-target-custom-web-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    writeFileSync(
      join(sandbox, "openuispec", "platform", "web.yaml"),
      YAML.stringify({
        web: {
          framework: "solidstart",
          language: "typescript",
          generation: {
            routing: "wouter",
            state: "valtio",
            runtime: "frontend_only",
            storage_backend: "none",
            dependencies: ["valtio", "wouter"],
          },
        },
      })
    );

    runConfigure(sandbox, ["web", "--defaults"]);

    const configured = YAML.parse(
      readFileSync(join(sandbox, "openuispec", "platform", "web.yaml"), "utf-8")
    );
    const web = configured.web;

    assert.equal(web.framework, "solidstart");
    assert.equal(web.generation.routing, "wouter");
    assert.equal(web.generation.state, "valtio");
    assert.ok(web.generation.dependencies.includes("valtio"));
    assert.ok(web.generation.dependencies.includes("wouter"));
    assert.ok(!web.generation.dependencies.includes("react-router"));
    assert.ok(!web.generation.dependencies.includes("zustand"));
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("configure-target preserves existing android MVVM architecture under defaults", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-configure-target-android-mvvm-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });

    runConfigure(sandbox, ["android", "--defaults"]);

    const configured = YAML.parse(
      readFileSync(join(sandbox, "openuispec", "platform", "android.yaml"), "utf-8")
    );
    const android = configured.android;

    assert.equal(android.generation.architecture, "MVVM");
    assert.ok(!android.generation.dependencies.includes("decompose"));
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("configure-target writes default web stack with tailwind css", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-configure-target-web-css-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    unlinkSync(join(sandbox, "openuispec", "platform", "web.yaml"));

    runConfigure(sandbox, ["web", "--defaults"]);

    const configured = YAML.parse(
      readFileSync(join(sandbox, "openuispec", "platform", "web.yaml"), "utf-8")
    );
    const web = configured.web;

    assert.equal(web.generation.css, "tailwind");
    assert.ok(web.generation.dependencies.includes("tailwindcss"));
    assert.ok(web.generation.dependencies.includes("react"));
    assert.ok(web.generation.dependencies.includes("react-dom"));
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("configure-target writes vue framework with pinia and vue-router defaults", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-configure-target-vue-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    writeFileSync(
      join(sandbox, "openuispec", "platform", "web.yaml"),
      YAML.stringify({ web: { framework: "vue", language: "typescript" } })
    );

    runConfigure(sandbox, ["web", "--defaults"]);

    const configured = YAML.parse(
      readFileSync(join(sandbox, "openuispec", "platform", "web.yaml"), "utf-8")
    );
    const web = configured.web;

    assert.equal(web.framework, "vue");
    assert.equal(web.generation.routing, "vue_router");
    assert.equal(web.generation.state, "pinia");
    assert.ok(web.generation.dependencies.includes("vue"));
    assert.ok(web.generation.dependencies.includes("vue-router"));
    assert.ok(web.generation.dependencies.includes("pinia"));
    assert.ok(!web.generation.dependencies.includes("react"));
    assert.ok(!web.generation.dependencies.includes("react-router"));
    assert.ok(!web.generation.dependencies.includes("zustand"));
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("configure-target writes svelte framework with sveltekit routing and svelte stores defaults", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-configure-target-svelte-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    writeFileSync(
      join(sandbox, "openuispec", "platform", "web.yaml"),
      YAML.stringify({ web: { framework: "svelte", language: "typescript" } })
    );

    runConfigure(sandbox, ["web", "--defaults"]);

    const configured = YAML.parse(
      readFileSync(join(sandbox, "openuispec", "platform", "web.yaml"), "utf-8")
    );
    const web = configured.web;

    assert.equal(web.framework, "svelte");
    assert.equal(web.generation.routing, "sveltekit_routing");
    assert.equal(web.generation.state, "svelte_stores");
    assert.ok(web.generation.dependencies.includes("svelte"));
    assert.ok(web.generation.dependencies.includes("@sveltejs/kit"));
    assert.ok(!web.generation.dependencies.includes("react"));
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("configure-target preserves existing minio storage_backend as custom value", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-configure-target-minio-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    writeFileSync(
      join(sandbox, "openuispec", "platform", "web.yaml"),
      YAML.stringify({
        web: {
          framework: "react",
          language: "typescript",
          generation: {
            routing: "react_router",
            state: "zustand",
            storage_backend: "minio",
          },
        },
      })
    );

    runConfigure(sandbox, ["web", "--defaults"]);

    const configured = YAML.parse(
      readFileSync(join(sandbox, "openuispec", "platform", "web.yaml"), "utf-8")
    );

    assert.equal(configured.web.generation.storage_backend, "minio");
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
