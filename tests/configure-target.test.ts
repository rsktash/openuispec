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
    assert.match(output, /ask the user to confirm the target stack/i);
    assert.match(output, /interactive terminal/i);
    assert.match(output, /--defaults/);
    assert.match(output, /remain unconfirmed/i);
    assert.match(output, /prepare.*block implementation/i);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("configure-target lists prompt options as JSON without requiring a project or tty", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-configure-target-options-"));

  try {
    const output = runConfigure(sandbox, ["web", "--list-options"]);
    const listed = JSON.parse(output);

    assert.equal(listed.target, "web");
    assert.equal(listed.defaults_are_unconfirmed, true);
    assert.equal(listed.confirmation_required_before_implementation, true);
    assert.equal(listed.interactive_command, "openuispec configure-target web");
    assert.equal(listed.defaults_command, "openuispec configure-target web --defaults");
    assert.equal(listed.framework.prompt, "Web UI framework");
    assert.ok(listed.framework.options.includes("react"));
    assert.ok(listed.framework.options.includes("vue"));
    assert.ok(listed.framework.options.includes("svelte"));
    assert.ok(listed.framework.options.includes("other"));

    const routing = listed.questions.find((question: any) => question.key === "routing");
    assert.ok(routing);
    assert.equal(routing.prompt, "Web routing");
    assert.equal(routing.custom_allowed, true);

    const reactRouter = routing.options.find((option: any) => option.value === "react_router");
    assert.ok(reactRouter);
    assert.ok(reactRouter.refs.packages.includes("react-router@{latest stable}"));
    assert.ok(reactRouter.refs.docs.includes("https://reactrouter.com/"));
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
    assert.equal(android.generation.stack_confirmation.status, "pending_user_confirmation");
    assert.equal(android.generation.stack_confirmation.source, "defaults");
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

test("configure-target --set writes correct values and marks stack as confirmed", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-configure-target-set-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    unlinkSync(join(sandbox, "openuispec", "platform", "web.yaml"));

    runConfigure(sandbox, ["web", "--set", "routing=tanstack_router", "--set", "state=zustand"]);

    const configured = YAML.parse(
      readFileSync(join(sandbox, "openuispec", "platform", "web.yaml"), "utf-8")
    );
    const web = configured.web;

    assert.equal(web.generation.routing, "tanstack_router");
    assert.equal(web.generation.state, "zustand");
    assert.equal(web.generation.stack_confirmation.status, "confirmed");
    assert.equal(web.generation.stack_confirmation.source, "user");
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("configure-target --set preserves other existing values", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-configure-target-set-preserve-"));

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
            css: "tailwind",
            runtime: "frontend_only",
            storage_backend: "none",
          },
        },
      })
    );

    runConfigure(sandbox, ["web", "--set", "routing=tanstack_router"]);

    const configured = YAML.parse(
      readFileSync(join(sandbox, "openuispec", "platform", "web.yaml"), "utf-8")
    );
    const web = configured.web;

    assert.equal(web.generation.routing, "tanstack_router");
    assert.equal(web.generation.state, "zustand");
    assert.equal(web.generation.css, "tailwind");
    assert.equal(web.generation.runtime, "frontend_only");
    assert.equal(web.generation.storage_backend, "none");
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("configure-target --set marks stack_confirmation as confirmed", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-configure-target-set-confirmed-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    unlinkSync(join(sandbox, "openuispec", "platform", "web.yaml"));

    runConfigure(sandbox, ["web", "--set", "routing=tanstack_router"]);

    const configured = YAML.parse(
      readFileSync(join(sandbox, "openuispec", "platform", "web.yaml"), "utf-8")
    );
    const web = configured.web;

    assert.equal(web.generation.stack_confirmation.status, "confirmed");
    assert.equal(web.generation.stack_confirmation.source, "user");
    assert.ok(web.generation.stack_confirmation.confirmed_at);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("configure-target web --defaults --quiet produces only the saved file path", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-configure-target-quiet-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    unlinkSync(join(sandbox, "openuispec", "platform", "web.yaml"));

    const output = runConfigure(sandbox, ["web", "--defaults", "--quiet"]);

    const lines = output.trim().split("\n").filter((l: string) => l.trim().length > 0);
    assert.equal(lines.length, 1);
    assert.match(lines[0], /platform\/web\.yaml/);
    assert.ok(!output.includes("Configured values:"));
    assert.ok(!output.includes("OpenUISpec"));
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
