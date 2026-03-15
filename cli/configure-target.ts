import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { findProjectDir, isSupportedTarget, readManifest, type SupportedTarget } from "../drift/index.js";
import { ask, askChoice } from "./init.js";

type WizardOptionPreset = {
  value: string;
  generation_value?: string;
  framework_filter?: string[];
  dependencies?: string[];
  extra_generation?: Record<string, any>;
  refs?: {
    plugins?: string[];
    libraries?: string[];
    packages?: string[];
    docs?: string[];
  };
};

type ChoiceQuestionPreset = {
  key: string;
  prompt: string;
  recommended: string;
  options: WizardOptionPreset[];
};

type TargetWizardPreset = {
  framework: string;
  framework_prompt?: string;
  framework_options?: string[];
  language?: string;
  min_version?: string;
  min_sdk?: number;
  target_sdk?: number;
  generation_defaults?: Record<string, any>;
  base_dependencies?: string[];
  framework_dependencies?: Record<string, string[]>;
  questions: ChoiceQuestionPreset[];
};

export type TargetWizardOptionsResponse = {
  target: SupportedTarget;
  defaults_are_unconfirmed: true;
  confirmation_required_before_implementation: true;
  interactive_command: string;
  defaults_command: string;
  framework: {
    prompt: string;
    recommended: string;
    options: string[];
    custom_allowed: true;
  };
  questions: Array<{
    key: string;
    prompt: string;
    recommended: string;
    custom_allowed: true;
    options: WizardOptionPreset[];
  }>;
};

function readWizardPresets(): Record<SupportedTarget, TargetWizardPreset> {
  const presetsPath = join(dirname(fileURLToPath(import.meta.url)), "target-presets.json");
  return JSON.parse(readFileSync(presetsPath, "utf-8")) as Record<SupportedTarget, TargetWizardPreset>;
}

const TARGET_WIZARDS = readWizardPresets();

function listFrameworkOptions(wizard: TargetWizardPreset): string[] {
  return [...new Set([...(wizard.framework_options ?? [wizard.framework]), "other"])];
}

export function listTargetWizardOptions(target: SupportedTarget): TargetWizardOptionsResponse {
  const wizard = TARGET_WIZARDS[target];
  return {
    target,
    defaults_are_unconfirmed: true,
    confirmation_required_before_implementation: true,
    interactive_command: `openuispec configure-target ${target}`,
    defaults_command: `openuispec configure-target ${target} --defaults`,
    framework: {
      prompt: wizard.framework_prompt ?? `${target} framework`,
      recommended: wizard.framework,
      options: listFrameworkOptions(wizard),
      custom_allowed: true,
    },
    questions: wizard.questions.map((question) => ({
      key: question.key,
      prompt: question.prompt,
      recommended: question.recommended,
      custom_allowed: true,
      options: question.options,
    })),
  };
}

function filterOptionsForFramework(
  question: ChoiceQuestionPreset,
  framework: string
): WizardOptionPreset[] {
  return question.options.filter((option) => {
    if (!option.framework_filter) return true;
    return option.framework_filter.includes(framework);
  });
}

function effectiveDefault(
  question: ChoiceQuestionPreset,
  framework: string,
  inferred: string | undefined
): string {
  if (inferred) return inferred;
  const filtered = filterOptionsForFramework(question, framework);
  if (filtered.some((o) => o.value === question.recommended)) return question.recommended;
  return filtered[0]?.value ?? question.recommended;
}

function mergeDependencies(
  derived: string[],
  existing: unknown,
  managedDependencies: Set<string>
): string[] {
  const extras = Array.isArray(existing)
    ? existing.filter((dep): dep is string => typeof dep === "string" && !managedDependencies.has(dep))
    : [];
  return Array.from(new Set([...derived, ...extras]));
}

function findOption(question: ChoiceQuestionPreset, value: string): WizardOptionPreset | null {
  return question.options.find((option) => option.value === value) ?? null;
}

function collectManagedDependencies(wizard: TargetWizardPreset): Set<string> {
  const managed = new Set<string>(wizard.base_dependencies ?? []);
  if (wizard.framework_dependencies) {
    for (const deps of Object.values(wizard.framework_dependencies)) {
      for (const dep of deps) managed.add(dep);
    }
  }
  for (const question of wizard.questions) {
    for (const option of question.options) {
      for (const dependency of option.dependencies ?? []) {
        managed.add(dependency);
      }
    }
  }
  return managed;
}

function normalizeAndroid(existingPlatform: Record<string, any>): Record<string, string> {
  const generation = existingPlatform.generation ?? {};
  const deps = new Set(Array.isArray(generation.dependencies) ? generation.dependencies : []);
  const architectureValue = typeof generation.architecture === "string" ? generation.architecture.toLowerCase() : "";
  const stateValue = typeof generation.state === "string" ? generation.state.toLowerCase() : "";
  const persistenceValue = typeof generation.persistence === "string" ? generation.persistence.toLowerCase() : "";
  return {
    architecture:
      typeof generation.architecture === "string" &&
      !architectureValue.includes("decompose") &&
      !architectureValue.includes("compose") &&
      !deps.has("decompose") &&
      !deps.has("navigation-compose")
        ? generation.architecture
        : architectureValue.includes("decompose") || deps.has("decompose")
        ? "decompose"
        : architectureValue.includes("compose") || deps.has("navigation-compose")
          ? "plain_compose"
          : "decompose",
    state:
      typeof generation.state === "string" &&
      !stateValue.includes("mvikotlin") &&
      !stateValue.includes("viewmodel") &&
      !deps.has("mvikotlin") &&
      !deps.has("lifecycle-viewmodel-compose")
        ? generation.state
        : stateValue.includes("mvikotlin") || deps.has("mvikotlin")
        ? "mvikotlin"
        : stateValue.includes("viewmodel") || deps.has("lifecycle-viewmodel-compose")
          ? "viewmodel"
          : "mvikotlin",
    preferences:
      typeof generation.preferences === "string"
        ? generation.preferences
        : persistenceValue === "datastore" || deps.has("datastore-preferences")
          ? "datastore"
          : "datastore",
    database:
      typeof generation.database === "string"
        ? generation.database
        : persistenceValue === "sqldelight" || deps.has("sqldelight")
          ? "sqldelight"
          : persistenceValue === "room" || deps.has("room-runtime")
            ? "room"
            : "none",
    di:
      typeof generation.di === "string"
        ? ["metro", "koin", "hilt", "none"].includes(generation.di)
          ? generation.di
          : generation.di
        : deps.has("metro")
          ? "metro"
          : deps.has("koin-android")
            ? "koin"
            : deps.has("hilt-android")
              ? "hilt"
              : "metro",
  };
}

function normalizeWeb(existingPlatform: Record<string, any>): Record<string, string> {
  const generation = existingPlatform.generation ?? {};
  const result: Record<string, string> = {
    runtime:
      typeof generation.runtime === "string"
        ? generation.runtime
        : "frontend_only",
    css:
      typeof generation.css === "string"
        ? generation.css
        : "tailwind",
    storage_backend:
      typeof generation.storage_backend === "string"
        ? generation.storage_backend
        : "none",
  };

  if (typeof generation.routing === "string") {
    result.routing = generation.routing.includes("tanstack")
      ? "tanstack_router"
      : generation.routing.includes("react-router") || generation.routing === "react_router"
        ? "react_router"
        : generation.routing;
  }

  if (typeof generation.state === "string") {
    result.state = generation.state === "redux-toolkit"
      ? "redux"
      : generation.state === "tanstack-query"
        ? "query_only"
        : generation.state;
  }

  return result;
}

function normalizeIos(existingPlatform: Record<string, any>): Record<string, string> {
  const generation = existingPlatform.generation ?? {};
  const deps = new Set(Array.isArray(generation.dependencies) ? generation.dependencies : []);
  return {
    architecture:
      typeof generation.architecture === "string" &&
      !generation.architecture.toLowerCase().includes("tca") &&
      generation.architecture.toLowerCase() !== "native swiftui"
        ? generation.architecture
        : typeof generation.architecture === "string" && generation.architecture.toLowerCase().includes("tca")
        ? "tca_style"
        : deps.has("swift-composable-architecture")
          ? "tca_style"
          : "native",
    persistence:
      typeof generation.persistence === "string"
        ? generation.persistence
        : deps.has("sqlite")
          ? "sqlite"
          : deps.has("swiftdata")
            ? "swiftdata"
            : "swiftdata",
    di:
      typeof generation.di === "string"
        ? generation.di
        : deps.has("factory")
          ? "factory"
          : deps.has("custom-di")
            ? "custom"
            : "none",
  };
}

function normalizeExisting(target: SupportedTarget, existingPlatform: Record<string, any>): Record<string, string> {
  switch (target) {
    case "android":
      return normalizeAndroid(existingPlatform);
    case "web":
      return normalizeWeb(existingPlatform);
    case "ios":
      return normalizeIos(existingPlatform);
  }
}

function buildGeneration(
  wizard: TargetWizardPreset,
  answers: Record<string, string>,
  existingGeneration: Record<string, any>,
  framework: string
): Record<string, any> {
  const generation = {
    ...(wizard.generation_defaults ?? {}),
    ...existingGeneration,
  };
  const managedDependencies = collectManagedDependencies(wizard);
  const frameworkDeps = wizard.framework_dependencies?.[framework] ?? [];
  const derivedDependencies = [...(wizard.base_dependencies ?? []), ...frameworkDeps];

  for (const question of wizard.questions) {
    const answer = answers[question.key];
    const selected = answer ? findOption(question, answer) : null;
    if (!selected) {
      generation[question.key] = answer || question.recommended;
      continue;
    }
    generation[question.key] = selected.generation_value ?? selected.value;
    Object.assign(generation, selected.extra_generation ?? {});
    derivedDependencies.push(...(selected.dependencies ?? []));
  }

  generation.dependencies = mergeDependencies(
    derivedDependencies,
    existingGeneration.dependencies,
    managedDependencies
  );

  return generation;
}

function stackConfirmation(useDefaults: boolean): Record<string, string> {
  const now = new Date().toISOString();
  return useDefaults
    ? {
        status: "pending_user_confirmation",
        source: "defaults",
        updated_at: now,
      }
    : {
        status: "confirmed",
        source: "user",
        confirmed_at: now,
      };
}

function parseTarget(argv: string[]): SupportedTarget | null {
  const direct = argv[0];
  if (direct && isSupportedTarget(direct)) {
    return direct;
  }
  const targetIdx = argv.indexOf("--target");
  if (targetIdx !== -1 && argv[targetIdx + 1] && isSupportedTarget(argv[targetIdx + 1])) {
    return argv[targetIdx + 1];
  }
  return null;
}

function parseSetPairs(argv: string[]): Record<string, string> {
  const pairs: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--set" && argv[i + 1]) {
      const raw = argv[i + 1];
      const eqIdx = raw.indexOf("=");
      if (eqIdx > 0) {
        pairs[raw.slice(0, eqIdx)] = raw.slice(eqIdx + 1);
      }
      i++;
    }
  }
  return pairs;
}

export async function runConfigureTarget(argv: string[]): Promise<void> {
  const target = parseTarget(argv);
  const listOptions = argv.includes("--list-options");
  const useDefaults = argv.includes("--defaults");
  const quiet = argv.includes("--quiet");
  const setPairs = parseSetPairs(argv);
  const hasSetPairs = Object.keys(setPairs).length > 0;
  const interactive = stdin.isTTY && stdout.isTTY && !useDefaults && !hasSetPairs;
  if (!target) {
    console.error("Error: target is required for configure-target");
    console.error("Usage: openuispec configure-target <ios|android|web> [--defaults] [--list-options] [--set key=value]");
    process.exit(1);
  }

  if (listOptions) {
    console.log(JSON.stringify(listTargetWizardOptions(target), null, 2));
    return;
  }

  if (!interactive && !useDefaults && !hasSetPairs) {
    console.error(
      "Error: `openuispec configure-target` needs a TTY for prompts.\n" +
        "Preferred: ask the user to confirm the target stack, then run `openuispec configure-target <target>` in an interactive terminal.\n" +
        "Fallback: run with `--defaults` only for unattended setup; those values remain unconfirmed and `prepare` will block implementation until the user confirms them."
    );
    process.exit(1);
  }

  const projectDir = findProjectDir(process.cwd());
  const manifest = readManifest(projectDir);
  const configuredTargets: string[] = manifest.generation?.targets ?? [];
  if (configuredTargets.length > 0 && !configuredTargets.includes(target)) {
    console.error(
      `Error: target "${target}" is not listed in generation.targets.\n` +
        `Configured targets: ${configuredTargets.join(", ")}`
    );
    process.exit(1);
  }

  const platformDir = resolve(projectDir, manifest.includes?.platform ?? "./platform/");
  mkdirSync(platformDir, { recursive: true });

  const platformPath = join(platformDir, `${target}.yaml`);
  const existingDoc = existsSync(platformPath)
    ? (YAML.parse(readFileSync(platformPath, "utf-8")) as Record<string, any>)
    : {};
  const existingPlatform = existingDoc[target] ?? {};
  const existingGeneration = existingPlatform.generation ?? {};
  const wizard = TARGET_WIZARDS[target];
  const defaultFramework =
    typeof existingPlatform.framework === "string" && existingPlatform.framework.trim().length > 0
      ? existingPlatform.framework
      : wizard.framework;
  const inferredDefaults = {
    ...normalizeExisting(target, existingPlatform),
  };

  let framework = defaultFramework;

  function computeDefaultAnswers(fw: string): Record<string, string> {
    return Object.fromEntries(
      wizard.questions.map((question) => {
        const defaultValue = effectiveDefault(question, fw, inferredDefaults[question.key]);
        return [question.key, defaultValue];
      })
    );
  }

  let answers = computeDefaultAnswers(framework);

  if (hasSetPairs) {
    // Non-interactive --set path: merge provided values with existing/defaults
    const knownKeys = new Set(wizard.questions.map((q) => q.key));
    for (const [key, value] of Object.entries(setPairs)) {
      if (!knownKeys.has(key)) {
        console.error(`Warning: "${key}" does not match any wizard question; setting as custom value.`);
      }
      answers[key] = value;
    }
  } else if (interactive) {
    const rl = createInterface({ input: stdin, output: stdout });

    try {
      console.log(`\nOpenUISpec — Configure ${target}\n`);
      console.log(`Writing target stack choices to ${relative(process.cwd(), platformPath)}\n`);

      const frameworkOptions = [
        ...(wizard.framework_options ?? [wizard.framework]),
        "other",
      ];
      const chosenFramework = await askChoice(
        rl,
        wizard.framework_prompt ?? `${target} framework`,
        frameworkOptions,
        framework
      );
      framework =
        chosenFramework === "other"
          ? await ask(rl, `Custom ${target} framework`, framework)
          : chosenFramework;

      const defaultAnswers = computeDefaultAnswers(framework);
      answers = {};
      for (const question of wizard.questions) {
        const filtered = filterOptionsForFramework(question, framework);
        const chosen = await askChoice(
          rl,
          question.prompt,
          [...filtered.map((option) => option.value), "other"],
          defaultAnswers[question.key]
        );
        answers[question.key] =
          chosen === "other"
            ? await ask(rl, `Custom value for ${question.key}`, defaultAnswers[question.key])
            : chosen;
      }
    } finally {
      rl.close();
    }
  }

  // --set implies confirmed (user explicitly chose values); --defaults without --set is pending
  const updatedPlatform: Record<string, any> = {
    ...existingPlatform,
    framework,
    generation: {
      ...buildGeneration(wizard, answers, existingGeneration, framework),
      stack_confirmation: stackConfirmation(useDefaults && !hasSetPairs),
    },
  };

  if (wizard.language) updatedPlatform.language = wizard.language;
  if (wizard.min_version) updatedPlatform.min_version = existingPlatform.min_version ?? wizard.min_version;
  if (typeof wizard.min_sdk === "number") updatedPlatform.min_sdk = existingPlatform.min_sdk ?? wizard.min_sdk;
  if (typeof wizard.target_sdk === "number") {
    updatedPlatform.target_sdk = existingPlatform.target_sdk ?? wizard.target_sdk;
  }

  writeFileSync(platformPath, YAML.stringify({ [target]: updatedPlatform }));

  const savedPath = relative(process.cwd(), platformPath);
  if (argv.includes("--silent")) {
    // Called as subroutine (e.g. from init --quiet) — no output at all
  } else if (quiet) {
    console.log(savedPath);
  } else {
    console.log(`\nSaved ${savedPath}`);
    console.log("Configured values:");
    for (const [key, value] of Object.entries(answers)) {
      console.log(`  - ${key}: ${value}`);
    }
  }
}
