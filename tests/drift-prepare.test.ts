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
const prepareScript = join(repoRoot, "prepare", "index.ts");

function tsxArgs(script: string, args: string[]): string[] {
  return ["--import", tsxLoader, script, ...args];
}

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
      const failed = error as any;
      return `${String(failed.stdout ?? "")}${String(failed.stderr ?? "")}`;
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
    mkdirSync(join(sandbox, "backend"), { recursive: true });
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

    run(sandbox, nodeBin, tsxArgs(driftScript, ["--snapshot", "--target", "web"]));

    const specFile = join(sandbox, "openuispec", "screens", "task_detail.yaml");
    const updated = readFileSync(specFile, "utf-8").replace(
      'title: "$t:task_detail.title"',
      'title: "$t:task_detail.more_info"'
    );
    writeFileSync(specFile, updated);

    const explainOutput = run(
      sandbox,
      nodeBin,
      tsxArgs(driftScript, ["--target", "web", "--explain"]),
      { allowFailure: true }
    );

    assert.match(explainOutput, /task_detail\.title/);
    assert.match(explainOutput, /\$t:task_detail\.title/);
    assert.match(explainOutput, /\$t:task_detail\.more_info/);

    const prepareOutput = run(sandbox, nodeBin, tsxArgs(prepareScript, ["--target", "web", "--json"]));
    const prepared = JSON.parse(prepareOutput);

    assert.equal(prepared.mode, "update");
    assert.equal(prepared.backend_root.endsWith("/backend"), true);
    assert.equal(prepared.platform_config.framework, "react");
    assert.equal(prepared.platform_config.language, "typescript");
    assert.equal(prepared.platform_config.stack.routing, "react_router");
    assert.equal(prepared.platform_config.stack.state, "zustand");
    assert.deepEqual(prepared.platform_config.dependencies, []);
    assert.equal(prepared.summary.changed, 1);
    assert.equal(prepared.items[0].spec_file, "screens/task_detail.yaml");
    assert.equal(prepared.items[0].semantic_changes[0].path, "task_detail.title");
    assert.ok(prepared.items[0].likely_files.includes("src/App.tsx"));
    assert.equal(prepared.design_context.complexity, "restrained");
    assert.equal(typeof prepared.design_context.personality, "string");
    assert.ok(Object.keys(prepared.anti_patterns.universal).length > 0);
    assert.ok(Object.keys(prepared.anti_patterns.contract_specific).length > 0);
    assert.ok(prepared.anti_patterns.project_specific.length > 0);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("prepare matches platform tags case-insensitively when filtering anti-patterns", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-prepare-platform-tags-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    mkdirSync(join(sandbox, "backend"), { recursive: true });

    const manifestPath = join(sandbox, "openuispec", "openuispec.yaml");
    const manifest = readFileSync(manifestPath, "utf-8");
    writeFileSync(
      manifestPath,
      manifest.replace(
        'avoid:\n    - "Do not add decorative illustrations or background patterns"\n    - "Do not use more than 2 accent colors on any screen"\n    - "Do not animate list items on page load — only animate user-triggered state changes"',
        'avoid:\n    - "[Web] Loud glassmorphism everywhere"\n    - "[iOS] Bottom sheets for every action"'
      ).replace(
        '- "Do not use pure black (#000000) or pure white (#FFFFFF) — always resolve through the token layer"',
        '- "[Web] Avoid generic monochrome hero panels"\n      - "[iOS] Native tab bars replaced with hamburger menus"'
      )
    );

    const contractPath = join(sandbox, "openuispec", "contracts", "action_trigger.yaml");
    const contract = readFileSync(contractPath, "utf-8");
    writeFileSync(
      contractPath,
      contract.replace(
        'must_avoid:\n      - "Do not apply gradient backgrounds to buttons — use flat token-defined colors"',
        'must_avoid:\n      - "[Web] Default browser button styling"\n      - "[Android] iOS-style pill segmented controls"'
      )
    );

    const prepareOutput = run(sandbox, nodeBin, tsxArgs(prepareScript, ["--target", "web", "--json"]));
    const prepared = JSON.parse(prepareOutput);

    assert.ok(
      prepared.anti_patterns.universal.color.includes(
        "[Web] Avoid generic monochrome hero panels"
      )
    );
    assert.ok(
      !prepared.anti_patterns.universal.color.includes(
        "[iOS] Native tab bars replaced with hamburger menus"
      )
    );
    assert.ok(
      prepared.anti_patterns.project_specific.includes("[Web] Loud glassmorphism everywhere")
    );
    assert.ok(
      !prepared.anti_patterns.project_specific.includes("[iOS] Bottom sheets for every action")
    );
    assert.ok(
      prepared.anti_patterns.contract_specific.action_trigger.includes(
        "[Web] Default browser button styling"
      )
    );
    assert.ok(
      !prepared.anti_patterns.contract_specific.action_trigger.includes(
        "[Android] iOS-style pill segmented controls"
      )
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("prepare still returns contract anti-patterns when one contract yaml is malformed", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-prepare-broken-contract-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    mkdirSync(join(sandbox, "backend"), { recursive: true });

    writeFileSync(
      join(sandbox, "openuispec", "contracts", "action_trigger.yaml"),
      "action_trigger:\n  generation:\n    must_avoid:\n      - [broken\n"
    );

    const prepareOutput = run(sandbox, nodeBin, tsxArgs(prepareScript, ["--target", "web", "--json"]));
    const prepared = JSON.parse(prepareOutput);

    assert.ok(
      prepared.anti_patterns.contract_specific.collection.length > 0,
      "expected other contract anti-patterns to survive a malformed contract file",
    );
    assert.equal(
      prepared.anti_patterns.contract_specific.action_trigger,
      undefined,
      "malformed contract should be skipped instead of suppressing all contract-specific anti-patterns",
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("prepare emits a bootstrap bundle and recommends configure-target when stack choices are missing", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-prepare-missing-output-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    mkdirSync(join(sandbox, "backend"), { recursive: true });

    const prepareOutput = run(sandbox, nodeBin, tsxArgs(prepareScript, ["--target", "web", "--json"]));
    const prepared = JSON.parse(prepareOutput);

    assert.equal(prepared.mode, "bootstrap");
    assert.equal(prepared.project, "Todo Orbit");
    assert.equal(prepared.target, "web");
    assert.equal(prepared.output_dir.endsWith("generated/web/Todo Orbit"), true);
    assert.equal(prepared.backend_root.endsWith("/backend"), true);
    assert.equal(prepared.platform_config.framework, "react");
    assert.equal(prepared.platform_config.language, "typescript");
    assert.equal(prepared.platform_config.stack.bundler, "vite");
    assert.equal(prepared.platform_config.stack.routing, "react_router");
    assert.equal(prepared.platform_config.stack.state, "zustand");
    assert.equal(prepared.platform_config.dependency_guidance.anchor_refs_only, true);
    assert.ok(
      prepared.platform_config.dependency_guidance.notes.some((note: string) =>
        note.includes("not a complete dependency manifest")
      )
    );
    assert.ok(
      prepared.platform_config.dependency_guidance.notes.some((note: string) =>
        note.includes("supporting runtime, build")
      )
    );
    assert.deepEqual(prepared.platform_config.dependencies, []);
    assert.equal(prepared.bootstrap.output_exists, false);
    assert.equal(prepared.bootstrap.generation_ready, false);
    assert.deepEqual(prepared.bootstrap.missing_platform_decisions, ["runtime", "storage_backend"]);
    assert.deepEqual(prepared.bootstrap.generation_warnings, []);
    assert.equal(prepared.bootstrap.target_stack_options.target, "web");
    assert.equal(prepared.bootstrap.target_stack_options.interactive_command, "openuispec configure-target web");
    assert.ok(
      prepared.bootstrap.target_stack_options.questions.some((question: any) => question.key === "runtime")
    );
    assert.ok(
      prepared.bootstrap.target_stack_options.questions.some((question: any) => question.key === "storage_backend")
    );
    assert.equal(prepared.bootstrap.i18n.default_locale, "en");
    assert.deepEqual(prepared.bootstrap.i18n.supported_locales, ["en", "ru"]);
    assert.equal(prepared.bootstrap.output_format.language, "typescript");
    assert.equal(prepared.bootstrap.output_format.framework, "react");
    assert.equal(prepared.bootstrap.generation_constraints.localization.must_use_platform_native_i18n, true);
    assert.equal(prepared.bootstrap.generation_constraints.localization.forbid_in_memory_string_maps, true);
    assert.ok(
      prepared.bootstrap.generation_constraints.localization.required_files.includes(
        "src/i18n.ts or equivalent dedicated i18n module"
      )
    );
    assert.ok(
      prepared.bootstrap.generation_constraints.localization.lookup_module_guidance.includes(
        "not a giant in-memory map inside App.tsx"
      )
    );
    assert.equal(prepared.bootstrap.generation_constraints.file_structure.forbid_single_file_output, true);
    assert.ok(
      prepared.bootstrap.generation_constraints.file_structure.required_directories.includes("src/screens")
    );
    assert.ok(
      prepared.bootstrap.generation_constraints.file_structure.required_directories.includes("src/components")
    );
    assert.ok(
      prepared.bootstrap.generation_constraints.file_structure.screen_split_rule.includes("src/screens")
    );
    assert.ok(
      prepared.bootstrap.generation_constraints.file_structure.component_split_rule.includes("src/components")
    );
    assert.equal(
      prepared.bootstrap.generation_constraints.platform_setup.refresh_target_platform_knowledge,
      true
    );
    assert.ok(
      prepared.bootstrap.generation_constraints.platform_setup.notes.some((note: string) =>
        note.includes("stale memory")
      )
    );
    assert.ok(prepared.bootstrap.spec_files.some((file: any) => file.spec_file === "openuispec.yaml"));
    assert.ok(prepared.bootstrap.spec_files.some((file: any) => file.spec_file === "screens/home.yaml"));
    assert.ok(prepared.bootstrap.spec_files.some((file: any) => file.spec_file === "tokens/color.yaml"));
    assert.ok(prepared.bootstrap.spec_files.some((file: any) => file.spec_file === "platform/web.yaml"));
    assert.ok(prepared.bootstrap.spec_files.some((file: any) => file.spec_file === "locales/en.json"));
    assert.ok(
      prepared.bootstrap.generation_rules.some((rule: string) =>
        rule.includes("After the first accepted web output exists")
      )
    );
    assert.ok(
      prepared.bootstrap.reference_examples.some((example: string) =>
        example.endsWith("/spec/openuispec-v0.2.md")
      )
    );
    assert.ok(
      prepared.bootstrap.reference_examples.some((example: string) =>
        example.endsWith("/README.md")
      )
    );
    assert.ok(
      prepared.next_steps.some((step: string) =>
        step.includes("openuispec configure-target web")
      )
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("prepare marks bootstrap generation ready after required platform choices are present", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-prepare-ready-bootstrap-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    mkdirSync(join(sandbox, "backend"), { recursive: true });

    const platformFile = join(sandbox, "openuispec", "platform", "web.yaml");
    const updatedPlatform = readFileSync(platformFile, "utf-8").replace(
      'routing: "react_router"\n    state: "zustand"',
      'runtime: "frontend_only"\n    routing: "react_router"\n    state: "zustand"\n    storage_backend: "none"'
    );
    writeFileSync(platformFile, updatedPlatform);

    const prepareOutput = run(sandbox, nodeBin, tsxArgs(prepareScript, ["--target", "web", "--json"]));
    const prepared = JSON.parse(prepareOutput);

    assert.equal(prepared.mode, "bootstrap");
    assert.equal(prepared.platform_config.stack.runtime, "frontend_only");
    assert.equal(prepared.platform_config.stack.storage_backend, "none");
    assert.equal(prepared.bootstrap.generation_ready, true);
    assert.equal(prepared.bootstrap.target_stack_options, null);
    assert.deepEqual(prepared.bootstrap.missing_platform_decisions, []);
    assert.ok(
      prepared.next_steps.some((step: string) =>
        step.includes("Generate the initial web implementation")
      )
    );
    assert.ok(
      prepared.next_steps.some((step: string) =>
        step.includes("run `openuispec drift --snapshot --target web` to baseline it")
      )
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("prepare requires user confirmation when target stack was auto-filled from defaults", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-prepare-pending-confirmation-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    mkdirSync(join(sandbox, "backend"), { recursive: true });

    run(sandbox, nodeBin, tsxArgs(join(repoRoot, "cli", "index.ts"), ["configure-target", "web", "--defaults"]));

    const prepareOutput = run(sandbox, nodeBin, tsxArgs(prepareScript, ["--target", "web", "--json"]));
    const prepared = JSON.parse(prepareOutput);

    assert.equal(prepared.mode, "bootstrap");
    assert.equal(prepared.platform_config.stack_confirmation.status, "pending_user_confirmation");
    assert.equal(prepared.platform_config.stack_confirmation.requires_user_confirmation, true);
    assert.equal(prepared.bootstrap.pending_user_confirmation, true);
    assert.equal(prepared.bootstrap.generation_ready, false);
    assert.equal(prepared.bootstrap.target_stack_options.target, "web");
    assert.ok(
      prepared.bootstrap.generation_warnings.some((warning: string) =>
        warning.includes("requires explicit user confirmation")
      )
    );
    assert.ok(
      prepared.next_steps.some((step: string) =>
        step.includes("without `--defaults`") && step.includes("confirm the stack choices")
      )
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("prepare treats missing backend code root as optional hint when api endpoints are declared", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-prepare-missing-backend-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });

    const platformFile = join(sandbox, "openuispec", "platform", "web.yaml");
    const updatedPlatform = readFileSync(platformFile, "utf-8").replace(
      'routing: "react_router"\n    state: "zustand"',
      'runtime: "frontend_only"\n    routing: "react_router"\n    state: "zustand"\n    storage_backend: "none"'
    );
    writeFileSync(platformFile, updatedPlatform);

    const prepareOutput = run(sandbox, nodeBin, tsxArgs(prepareScript, ["--target", "web", "--json"]));
    const prepared = JSON.parse(prepareOutput);

    assert.equal(prepared.mode, "bootstrap");
    // backend is optional — should not block generation readiness
    assert.ok(
      prepared.next_steps.some((step: string) =>
        step.includes("Optional") && step.includes("code_roots.backend")
      )
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("prepare includes package-manager install refs for configured target options", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-prepare-dependency-urls-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    mkdirSync(join(sandbox, "backend"), { recursive: true });

    run(sandbox, nodeBin, tsxArgs(join(repoRoot, "cli", "index.ts"), ["configure-target", "android", "--defaults"]));
    const platformFile = join(sandbox, "openuispec", "platform", "android.yaml");
    const updatedPlatform = readFileSync(platformFile, "utf-8").replace(
      "architecture: MVVM",
      "architecture: decompose"
    );
    writeFileSync(platformFile, updatedPlatform);

    const prepareOutput = run(sandbox, nodeBin, tsxArgs(prepareScript, ["--target", "android", "--json"]));
    const prepared = JSON.parse(prepareOutput);

    assert.equal(prepared.mode, "bootstrap");
    assert.equal(
      prepared.platform_config.selected_option_refs.architecture.value,
      "decompose"
    );
    assert.ok(
      prepared.platform_config.selected_option_refs.architecture.plugins.includes(
        "org.jetbrains.kotlin.plugin.compose"
      )
    );
    assert.ok(
      prepared.platform_config.selected_option_refs.architecture.libraries.includes(
        "com.arkivanov.decompose:decompose:{latest stable}"
      )
    );
    assert.equal(
      prepared.platform_config.selected_option_refs.state.value,
      "mvikotlin"
    );
    assert.ok(
      prepared.platform_config.selected_option_refs.state.libraries.includes(
        "com.arkivanov.mvikotlin:mvikotlin:{latest stable}"
      )
    );
    assert.ok(
      prepared.platform_config.selected_option_refs.state.docs.includes(
        "https://github.com/arkivanov/MVIKotlin"
      )
    );
    assert.equal(
      prepared.platform_config.selected_option_refs.preferences.value,
      "datastore"
    );
    assert.ok(
      prepared.platform_config.selected_option_refs.preferences.libraries.includes(
        "androidx.datastore:datastore-preferences:{latest stable}"
      )
    );
    assert.equal(
      prepared.platform_config.selected_option_refs.di.value,
      "metro"
    );
    assert.ok(
      prepared.platform_config.selected_option_refs.di.libraries.includes(
        "dev.zacsweers.metro:metro:{latest stable}"
      )
    );
    assert.ok(
      prepared.platform_config.selected_option_refs.di.docs.includes(
        "https://github.com/ZacSweers/metro"
      )
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("prepare exposes npm package specs for configured web target options", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-prepare-web-package-refs-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    mkdirSync(join(sandbox, "backend"), { recursive: true });

    const platformFile = join(sandbox, "openuispec", "platform", "web.yaml");
    const updatedPlatform = readFileSync(platformFile, "utf-8").replace(
      'routing: "react_router"\n    state: "zustand"',
      'runtime: "frontend_only"\n    routing: "react_router"\n    state: "zustand"\n    storage_backend: "none"'
    );
    writeFileSync(platformFile, updatedPlatform);

    const prepareOutput = run(sandbox, nodeBin, tsxArgs(prepareScript, ["--target", "web", "--json"]));
    const prepared = JSON.parse(prepareOutput);

    assert.equal(prepared.mode, "bootstrap");
    assert.equal(prepared.platform_config.selected_option_refs.routing.value, "react_router");
    assert.ok(
      prepared.platform_config.selected_option_refs.routing.packages.includes("react-router@{latest stable}")
    );
    assert.ok(
      prepared.platform_config.selected_option_refs.routing.docs.includes("https://reactrouter.com/")
    );
    assert.equal(prepared.platform_config.selected_option_refs.state.value, "zustand");
    assert.ok(
      prepared.platform_config.selected_option_refs.state.packages.includes("zustand@{latest stable}")
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("prepare emits warnings and generic web constraints for custom framework stack values", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-prepare-custom-web-warnings-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    mkdirSync(join(sandbox, "backend"), { recursive: true });

    const platformFile = join(sandbox, "openuispec", "platform", "web.yaml");
    writeFileSync(
      platformFile,
      `web:
  framework: solidstart
  language: typescript
  generation:
    runtime: frontend_only
    routing: wouter
    state: valtio
    storage_backend: none
    bundler: vite
`
    );

    const prepareOutput = run(sandbox, nodeBin, tsxArgs(prepareScript, ["--target", "web", "--json"]));
    const prepared = JSON.parse(prepareOutput);

    assert.equal(prepared.mode, "bootstrap");
    assert.equal(prepared.platform_config.selected_option_refs.runtime.value, "frontend_only");
    assert.equal(prepared.platform_config.selected_option_refs.storage_backend.value, "none");
    assert.equal(prepared.platform_config.selected_option_refs.routing, undefined);
    assert.equal(prepared.platform_config.selected_option_refs.state, undefined);
    assert.ok(
      prepared.bootstrap.generation_warnings.some((warning: string) =>
        warning.includes('configured web routing value "wouter"')
      )
    );
    assert.ok(
      prepared.bootstrap.generation_warnings.some((warning: string) =>
        warning.includes('configured web framework "solidstart"')
      )
    );
    assert.ok(
      prepared.bootstrap.generation_constraints.localization.lookup_module_guidance.includes(
        "root app shell"
      )
    );
    assert.ok(
      !prepared.bootstrap.generation_constraints.localization.lookup_module_guidance.includes("App.tsx")
    );
    assert.ok(
      prepared.bootstrap.generation_constraints.file_structure.screen_split_rule.includes(
        "route/screen module"
      )
    );
    assert.ok(
      !prepared.bootstrap.generation_constraints.file_structure.screen_split_rule.includes("src/screens")
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("prepare recognizes vue as a known web framework with vue-specific constraints", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-prepare-vue-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    mkdirSync(join(sandbox, "backend"), { recursive: true });

    const platformFile = join(sandbox, "openuispec", "platform", "web.yaml");
    writeFileSync(
      platformFile,
      `web:
  framework: vue
  language: typescript
  generation:
    runtime: frontend_only
    routing: vue_router
    state: pinia
    storage_backend: none
    bundler: vite
`
    );

    const prepareOutput = run(sandbox, nodeBin, tsxArgs(prepareScript, ["--target", "web", "--json"]));
    const prepared = JSON.parse(prepareOutput);

    assert.equal(prepared.mode, "bootstrap");
    assert.equal(prepared.platform_config.framework, "vue");
    assert.equal(prepared.platform_config.selected_option_refs.routing.value, "vue_router");
    assert.ok(
      prepared.platform_config.selected_option_refs.routing.packages.includes("vue-router@{latest stable}")
    );
    assert.equal(prepared.platform_config.selected_option_refs.state.value, "pinia");
    assert.ok(
      prepared.platform_config.selected_option_refs.state.packages.includes("pinia@{latest stable}")
    );
    assert.ok(
      !prepared.bootstrap.generation_warnings.some((warning: string) =>
        warning.includes("not a built-in preset")
      )
    );
    assert.ok(
      prepared.bootstrap.generation_constraints.localization.lookup_module_guidance.includes("vue-i18n")
    );
    assert.ok(
      prepared.bootstrap.generation_constraints.file_structure.required_directories.includes("src/views or src/pages")
    );
    assert.ok(
      prepared.bootstrap.generation_constraints.file_structure.screen_split_rule.includes("App.vue")
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("snapshot for ios creates shared layer state file and prepare --target android sees it as already generated", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-shared-layer-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    mkdirSync(join(sandbox, "backend"), { recursive: true });

    // Add shared layer config to manifest (insert before formatters which is after generation block)
    const manifestPath = join(sandbox, "openuispec", "openuispec.yaml");
    const manifest = readFileSync(manifestPath, "utf-8");
    writeFileSync(
      manifestPath,
      manifest.replace(
        "\ngeneration_guidance:",
        `\n  shared:\n    mobile_common:\n      platforms: [ios, android]\n      language: kotlin\n      root: "../kmp-shared"\n      tracks: [manifest, contracts, flows]\n      scope: \"Business logic, data models, repositories. No UI.\"\n      paths:\n        domain: "common/domain/"\n        features: "common/features/"\n  structure:\n    ios:\n      root: "../kmp-shared"\n      paths:\n        ui: "iosApp/ui/"\n\ngeneration_guidance:`
      )
    );

    // Create the shared layer root and generated output dirs
    mkdirSync(join(sandbox, "kmp-shared", "common", "domain"), { recursive: true });
    mkdirSync(join(sandbox, "kmp-shared", "common", "features"), { recursive: true });
    mkdirSync(join(sandbox, "kmp-shared", "iosApp", "ui"), { recursive: true });
    cpSync(
      join(repoRoot, "examples", "todo-orbit", "generated", "web", "Todo Orbit"),
      join(sandbox, "generated", "ios", "Todo Orbit"),
      { recursive: true }
    );

    run(sandbox, "git", ["init"]);
    run(sandbox, "git", ["config", "user.email", "tests@openuispec.local"]);
    run(sandbox, "git", ["config", "user.name", "OpenUISpec Tests"]);
    run(sandbox, "git", ["add", "."]);
    run(sandbox, "git", ["commit", "-m", "baseline"]);

    // Snapshot for ios should auto-create shared layer state
    run(sandbox, nodeBin, tsxArgs(driftScript, ["--snapshot", "--target", "ios"]));

    // Verify shared layer state file was created
    const sharedStatePath = join(sandbox, "kmp-shared", ".openuispec-shared-mobile_common.json");
    assert.ok(
      readFileSync(sharedStatePath, "utf-8").includes('"generated_by_target":"ios"') ||
      readFileSync(sharedStatePath, "utf-8").includes('"generated_by_target": "ios"'),
      "shared state file should record ios as the generating target"
    );

    // Now prepare for android — shared layer should show as already generated
    const prepareOutput = run(sandbox, nodeBin, tsxArgs(prepareScript, ["--target", "android", "--json"]));
    const prepared = JSON.parse(prepareOutput);

    assert.ok(prepared.shared_layers, "should have shared_layers in prepare result");
    assert.equal(prepared.shared_layers.length, 1);
    assert.equal(prepared.shared_layers[0].name, "mobile_common");
    assert.equal(prepared.shared_layers[0].already_generated, true);
    assert.equal(prepared.shared_layers[0].generated_by_target, "ios");
    assert.ok(prepared.shared_layers[0].guidance.includes("already generated"));

    // Generation rules should mention the shared layer
    assert.ok(
      prepared.bootstrap.generation_rules.some((rule: string) =>
        rule.includes("mobile_common") && rule.includes("already generated")
      )
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("spec change causes drift on shared layer", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-shared-drift-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    mkdirSync(join(sandbox, "backend"), { recursive: true });

    // Add shared layer config (insert under generation block, before formatters)
    const manifestPath = join(sandbox, "openuispec", "openuispec.yaml");
    const manifest = readFileSync(manifestPath, "utf-8");
    writeFileSync(
      manifestPath,
      manifest.replace(
        "\ngeneration_guidance:",
        `\n  shared:\n    mobile_common:\n      platforms: [ios, android]\n      language: kotlin\n      root: "../kmp-shared"\n      tracks: [manifest, contracts, flows]\n      scope: \"Business logic, data models, repositories. No UI.\"\n\ngeneration_guidance:`
      )
    );

    mkdirSync(join(sandbox, "kmp-shared"), { recursive: true });
    cpSync(
      join(repoRoot, "examples", "todo-orbit", "generated", "web", "Todo Orbit"),
      join(sandbox, "generated", "ios", "Todo Orbit"),
      { recursive: true }
    );

    run(sandbox, "git", ["init"]);
    run(sandbox, "git", ["config", "user.email", "tests@openuispec.local"]);
    run(sandbox, "git", ["config", "user.name", "OpenUISpec Tests"]);
    run(sandbox, "git", ["add", "."]);
    run(sandbox, "git", ["commit", "-m", "baseline"]);

    run(sandbox, nodeBin, tsxArgs(driftScript, ["--snapshot", "--target", "ios"]));

    // Modify a screen file — should NOT cause drift on shared layer (screens not in default tracks)
    const screenFile = join(sandbox, "openuispec", "screens", "task_detail.yaml");
    const screenContent = readFileSync(screenFile, "utf-8").replace(
      'title: "$t:task_detail.title"',
      'title: "$t:task_detail.more_info"'
    );
    writeFileSync(screenFile, screenContent);

    const noDriftOutput = run(sandbox, nodeBin, tsxArgs(prepareScript, ["--target", "ios", "--json"]));
    const noDrift = JSON.parse(noDriftOutput);
    assert.ok(noDrift.shared_layers, "shared_layers should be present");
    assert.equal(noDrift.shared_layers[0].has_drift, false, "screen change should not cause shared layer drift");

    // Now modify a contract file (tracked by default shared layer) to cause drift
    const contractFile = join(sandbox, "openuispec", "contracts", "action_trigger.yaml");
    const contractContent = readFileSync(contractFile, "utf-8");
    writeFileSync(contractFile, contractContent + "\n# drift test change\n");

    // Prepare for ios should show shared layer with drift
    const prepareOutput = run(sandbox, nodeBin, tsxArgs(prepareScript, ["--target", "ios", "--json"]));
    const prepared = JSON.parse(prepareOutput);

    // In update mode, shared_layers should still appear if configured
    assert.ok(prepared.shared_layers, "shared_layers should be present");
    assert.equal(prepared.shared_layers[0].has_drift, true);
    assert.ok(prepared.shared_layers[0].guidance.includes("drifted"));
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

test("prepare includes tailwind refs when css is configured", () => {
  const sandbox = mkdtempSync(join(tmpdir(), "openuispec-prepare-tailwind-"));

  try {
    cpSync(join(repoRoot, "examples", "todo-orbit", "openuispec"), join(sandbox, "openuispec"), {
      recursive: true,
    });
    mkdirSync(join(sandbox, "backend"), { recursive: true });

    const platformFile = join(sandbox, "openuispec", "platform", "web.yaml");
    writeFileSync(
      platformFile,
      `web:
  framework: react
  language: typescript
  generation:
    runtime: frontend_only
    css: tailwind
    routing: react_router
    state: zustand
    storage_backend: none
    bundler: vite
`
    );

    const prepareOutput = run(sandbox, nodeBin, tsxArgs(prepareScript, ["--target", "web", "--json"]));
    const prepared = JSON.parse(prepareOutput);

    assert.equal(prepared.mode, "bootstrap");
    assert.equal(prepared.platform_config.selected_option_refs.css.value, "tailwind");
    assert.ok(
      prepared.platform_config.selected_option_refs.css.packages.includes("tailwindcss@{latest stable}")
    );
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});
