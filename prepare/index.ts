#!/usr/bin/env tsx
/**
 * AI preparation bundle for OpenUISpec projects.
 *
 * Usage:
 *   openuispec prepare --target ios         # AI-ready work bundle for ios
 *   openuispec prepare --target web --json  # machine-readable output
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { listTargetWizardOptions, type TargetWizardOptionsResponse } from "../cli/configure-target.js";
import {
  discoverSpecFiles,
  findProjectDir,
  hasStatusSemantics,
  isSupportedTarget,
  loadTargetDrift,
  readManifest,
  readProjectName,
  readStatus,
  hasDriftChanges,
  readSharedLayerState,
  readTargetStructure,
  resolveOutputDir,
  sharedLayersForTarget,
  specCategory,
  computeSharedDrift,
  type FileExplanation,
  type ExplainResult,
  type SemanticChange,
  type SharedLayerConfig,
} from "../drift/index.js";

interface PrepareItem {
  spec_file: string;
  category: string;
  status: "added" | "removed" | "changed";
  semantic_changes: SemanticChange[];
  likely_files: string[];
  notes: string[];
}

interface BootstrapSpecFile {
  spec_file: string;
  category: string;
  spec_status: string | null;
  notes: string[];
}

interface PrepareLocalizationConstraints {
  must_use_platform_native_i18n: boolean;
  forbid_in_memory_string_maps: boolean;
  runtime_resources: string[];
  required_files: string[];
  lookup_module_guidance: string;
  notes: string[];
}

interface PrepareFileStructureConstraints {
  forbid_single_file_output: boolean;
  required_directories: string[];
  screen_split_rule: string;
  component_split_rule: string;
  notes: string[];
}

interface PreparePlatformSetupConstraints {
  refresh_target_platform_knowledge: boolean;
  notes: string[];
}

interface PrepareGenerationConstraints {
  localization: PrepareLocalizationConstraints;
  file_structure: PrepareFileStructureConstraints;
  platform_setup: PreparePlatformSetupConstraints;
}

interface PreparePlatformConfig {
  framework: string | null;
  language: string | null;
  min_version: string | null;
  min_sdk: number | null;
  target_sdk: number | null;
  generation: Record<string, any>;
  stack: Record<string, string>;
  stack_confirmation: {
    status: string | null;
    requires_user_confirmation: boolean;
  };
  dependency_guidance: {
    anchor_refs_only: boolean;
    notes: string[];
  };
  selected_option_refs: Record<string, {
    value: string;
    plugins: string[];
    libraries: string[];
    packages: string[];
    docs: string[];
  }>;
  dependencies: string[];
}

interface PrepareBootstrapBundle {
  output_exists: boolean;
  generation_ready: boolean;
  missing_platform_decisions: string[];
  pending_user_confirmation: boolean;
  generation_warnings: string[];
  target_stack_options: TargetWizardOptionsResponse | null;
  includes: Record<string, string>;
  output_format: Record<string, any>;
  i18n: {
    default_locale: string | null;
    supported_locales: string[];
  };
  spec_files: BootstrapSpecFile[];
  generation_rules: string[];
  generation_constraints: PrepareGenerationConstraints;
  reference_examples: string[];
}

interface SharedLayerInfo {
  name: string;
  platforms: string[];
  language: string;
  root: string;
  paths: Record<string, string>;
  scope: string;
  tracks: string[];
  already_generated: boolean;
  generated_by_target: string | null;
  has_drift: boolean;
  guidance: string;
}

interface SpecFileContent {
  path: string;
  category: string;
  content: string;
}

export interface PrepareResult {
  mode: "bootstrap" | "update";
  project: string;
  target: string;
  output_dir: string;
  backend_root: string | null;
  platform_config: PreparePlatformConfig;
  code_roots: string[];
  baseline: {
    kind: string | null;
    commit: string | null;
    branch: string | null;
  };
  baseline_status?: {
    output_exists: boolean;
    snapshot_exists: boolean;
    action_needed: string | null;
  };
  summary: {
    changed: number;
    added: number;
    removed: number;
  };
  changes_available: boolean;
  explanation_note?: string;
  items: PrepareItem[];
  shared_layers?: SharedLayerInfo[];
  bootstrap?: PrepareBootstrapBundle;
  spec_contents?: SpecFileContent[];
  next_steps: string[];
}

function resolvePackageRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..");
}

function readPlatformDefinition(projectDir: string, manifest: Record<string, any>, target: string): Record<string, any> {
  const platformDir = resolve(projectDir, manifest.includes?.platform ?? "./platform/");
  const platformPath = join(platformDir, `${target}.yaml`);
  if (!existsSync(platformPath)) return {};
  try {
    const doc = YAML.parse(readFileSync(platformPath, "utf-8"));
    return doc?.[target] ?? {};
  } catch {
    return {};
  }
}

function readTargetPresetDependencyLinks(target: string): {
  questions: Array<{
    key: string;
    options: Array<{
      value: string;
      generation_value?: string;
      refs?: {
        plugins?: string[];
        libraries?: string[];
        packages?: string[];
        docs?: string[];
      };
    }>;
  }>;
} {
  try {
    const presetPath = join(resolvePackageRoot(), "cli", "target-presets.json");
    const presets = JSON.parse(readFileSync(presetPath, "utf-8")) as Record<
      string,
      {
        questions?: Array<{
          key: string;
          options?: Array<{
            value: string;
            generation_value?: string;
            refs?: {
              plugins?: string[];
              libraries?: string[];
              packages?: string[];
              docs?: string[];
            };
          }>;
        }>;
      }
    >;
    return {
      questions: (presets[target]?.questions ?? []).map((question) => ({
        key: question.key,
        options: question.options ?? [],
      })),
    };
  } catch {
    return { questions: [] };
  }
}

function platformStackKeys(target: string): string[] {
  switch (target) {
    case "android":
      return ["architecture", "state", "preferences", "database", "di", "naming"];
    case "web":
      return ["runtime", "routing", "state", "storage_backend", "bundler", "css", "naming"];
    case "ios":
      return ["architecture", "persistence", "di", "naming"];
    default:
      return [];
  }
}

function buildPlatformConfig(target: string, platformDef: Record<string, any>): PreparePlatformConfig {
  const generation =
    platformDef.generation && typeof platformDef.generation === "object" ? platformDef.generation : {};
  const links = readTargetPresetDependencyLinks(target);
  const stack = Object.fromEntries(
    platformStackKeys(target)
      .map((key) => [key, generation[key]])
      .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0)
  );
  const dependencies = Array.isArray(generation.dependencies)
    ? generation.dependencies.filter((dep): dep is string => typeof dep === "string")
    : [];
  const selectedOptionRefs = Object.fromEntries(
    links.questions
      .map((question) => {
        const generationValue = generation[question.key];
        if (typeof generationValue !== "string" || generationValue.trim().length === 0) {
          return null;
        }
        const selected = question.options.find(
          (option) => option.value === generationValue || option.generation_value === generationValue
        );
        if (!selected?.refs) {
          return null;
        }
        return [
          question.key,
          {
            value: selected.value,
            plugins: selected.refs.plugins ?? [],
            libraries: selected.refs.libraries ?? [],
            packages: selected.refs.packages ?? [],
            docs: selected.refs.docs ?? [],
          },
        ] as const;
      })
      .filter((entry): entry is readonly [string, {
        value: string;
        plugins: string[];
        libraries: string[];
        packages: string[];
        docs: string[];
      }] => entry !== null)
  );

  return {
    framework: typeof platformDef.framework === "string" ? platformDef.framework : null,
    language: typeof platformDef.language === "string" ? platformDef.language : null,
    min_version: typeof platformDef.min_version === "string" ? platformDef.min_version : null,
    min_sdk: typeof platformDef.min_sdk === "number" ? platformDef.min_sdk : null,
    target_sdk: typeof platformDef.target_sdk === "number" ? platformDef.target_sdk : null,
    generation,
    stack,
    stack_confirmation: {
      status:
        typeof generation.stack_confirmation?.status === "string"
          ? generation.stack_confirmation.status
          : null,
      requires_user_confirmation:
        generation.stack_confirmation?.status === "pending_user_confirmation",
    },
    dependency_guidance: {
      anchor_refs_only: true,
      notes: [
        "Selected option refs are anchor dependencies and setup references, not a complete dependency manifest.",
        "Add any supporting runtime, build, plugin, repository, annotation-processing, and dev/test dependencies required by the current platform/framework setup.",
        "Resolve exact versions, compatibility, and project wiring from current platform documentation instead of relying on stale memory.",
      ],
    },
    selected_option_refs: selectedOptionRefs,
    dependencies,
  };
}

function hasApiEndpoints(manifest: Record<string, any>): boolean {
  const endpoints = manifest.api?.endpoints;
  return typeof endpoints === "object" && endpoints !== null && Object.keys(endpoints).length > 0;
}

const KNOWN_WEB_FRAMEWORKS = new Set(["react", "vue", "svelte"]);

function isKnownWebFramework(framework: string | null): boolean {
  return framework !== null && KNOWN_WEB_FRAMEWORKS.has(framework);
}

function resolveBackendRoot(projectDir: string, manifest: Record<string, any>): string | null {
  const backendRoot = manifest.generation?.code_roots?.backend;
  if (typeof backendRoot !== "string" || backendRoot.trim().length === 0) {
    return null;
  }
  return resolve(projectDir, backendRoot);
}

// Use specCategory from drift/index.ts (imported above) instead of a local duplicate.
const categorizeSpecFile = specCategory;

function buildSharedLayerInfos(projectDir: string, target: string, layers?: SharedLayerConfig[]): SharedLayerInfo[] {
  const resolvedLayers = layers ?? sharedLayersForTarget(projectDir, target);
  if (resolvedLayers.length === 0) return [];

  return resolvedLayers.map((layer) => {
    const state = readSharedLayerState(layer);
    const alreadyGenerated = state !== null;

    // Only compute hash-based drift when tracks are configured
    let hasDrift = false;
    if (layer.tracks.length > 0) {
      const driftResult = computeSharedDrift(projectDir, layer);
      hasDrift = driftResult.state !== null && hasDriftChanges(driftResult.drift);
    }

    let guidance: string;
    if (alreadyGenerated && !hasDrift) {
      guidance = `Shared code already generated by ${state!.generated_by_target} — read existing code, don't regenerate.`;
    } else if (alreadyGenerated && hasDrift) {
      guidance = `Generated by ${state!.generated_by_target} but spec has drifted — review shared code for needed updates.`;
    } else {
      guidance = `Generate shared layer alongside ${target} platform code.`;
    }

    return {
      name: layer.name,
      platforms: layer.platforms,
      language: layer.language,
      root: layer.root,
      paths: layer.paths,
      scope: layer.scope,
      tracks: layer.tracks,
      already_generated: alreadyGenerated,
      generated_by_target: state?.generated_by_target ?? null,
      has_drift: hasDrift,
      guidance,
    };
  });
}

function collectSharedLayerPaths(layers: SharedLayerConfig[]): string[] {
  const paths: string[] = [];
  for (const layer of layers) {
    paths.push(layer.root);
    for (const p of Object.values(layer.paths)) {
      paths.push(resolve(layer.root, p));
    }
  }
  return paths;
}

function dedupeExistingPaths(candidates: string[]): string[] {
  const seen = new Set<string>();
  return candidates
    .map((c) => resolve(c))
    .filter((c) => existsSync(c))
    .filter((c) => {
      if (seen.has(c)) return false;
      seen.add(c);
      return true;
    });
}

function suggestCodeRoots(target: string, outputDir: string, projectDir?: string, sharedLayers?: SharedLayerConfig[]): string[] {
  const layers = sharedLayers ?? (projectDir ? sharedLayersForTarget(projectDir, target) : []);

  // When generation.structure is defined for the target, use it instead of heuristics
  if (projectDir) {
    const structure = readTargetStructure(projectDir, target);
    if (structure) {
      const candidates = [
        structure.root,
        ...Object.values(structure.paths).map((p) => resolve(structure.root, p)),
        ...collectSharedLayerPaths(layers),
      ];
      return dedupeExistingPaths(candidates);
    }
  }

  const candidates: string[] = [];

  if (target === "web") {
    candidates.push(join(outputDir, "src"), outputDir);
  } else if (target === "ios") {
    candidates.push(join(outputDir, "Sources"), join(outputDir, "Resources"), outputDir);
  } else if (target === "android") {
    candidates.push(
      join(outputDir, "app", "src", "main", "java"),
      join(outputDir, "app", "src", "main", "kotlin"),
      join(outputDir, "app", "src", "main", "res"),
      outputDir
    );
  } else {
    candidates.push(outputDir);
  }

  candidates.push(...collectSharedLayerPaths(layers));
  return dedupeExistingPaths(candidates);
}

function walkFiles(root: string, files: string[], depth = 0): void {
  if (depth > 8) return;

  for (const entry of readdirSync(root)) {
    if (
      entry === ".git" ||
      entry === "node_modules" ||
      entry === "build" ||
      entry === "dist" ||
      entry === ".gradle" ||
      entry === "DerivedData"
    ) {
      continue;
    }

    const fullPath = join(root, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      walkFiles(fullPath, files, depth + 1);
      continue;
    }

    files.push(fullPath);
  }
}

const SEARCHABLE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".json",
  ".swift", ".kt", ".kts", ".xml",
  ".css", ".scss", ".md", ".plist",
  ".yaml", ".yml", ".strings",
]);

function isSearchableFile(filePath: string): boolean {
  if (basename(filePath) === ".openuispec-state.json") return false;
  return SEARCHABLE_EXTENSIONS.has(extname(filePath).toLowerCase());
}

function normalizeTerm(term: string): string | null {
  const normalized = term.toLowerCase().replace(/[^a-z0-9._/-]+/g, "").trim();
  if (!normalized || normalized.length < 3) return null;
  if (["type", "props", "layout", "children", "title", "body", "root"].includes(normalized)) {
    return null;
  }
  return normalized;
}

function buildSearchTerms(file: FileExplanation): string[] {
  const terms = new Set<string>();
  const stem = basename(file.file, extname(file.file));
  const baseTerms = [
    stem,
    stem.replace(/_/g, ""),
    stem.replace(/_/g, "."),
  ];

  for (const term of baseTerms) {
    const normalized = normalizeTerm(term);
    if (normalized) terms.add(normalized);
  }

  for (const change of file.changes) {
    for (const part of change.path.split(/[.[\]/]+/)) {
      const normalized = normalizeTerm(part);
      if (normalized) terms.add(normalized);
    }
    const normalizedPath = normalizeTerm(change.path);
    if (normalizedPath) terms.add(normalizedPath);
  }

  return Array.from(terms).sort((a, b) => b.length - a.length);
}

function searchLikelyFiles(outputDir: string, codeRoots: string[], file: FileExplanation): string[] {
  const terms = buildSearchTerms(file);
  if (terms.length === 0) return [];

  const candidates: string[] = [];
  for (const root of codeRoots) {
    walkFiles(root, candidates);
  }

  const scored = candidates
    .filter(isSearchableFile)
    .map((candidate) => {
      const relPath = relative(outputDir, candidate);
      const pathScore = terms.reduce((sum, term) => sum + (relPath.toLowerCase().includes(term) ? 5 : 0), 0);

      let contentScore = 0;
      if (pathScore > 0 || terms.some((term) => term.includes("."))) {
        try {
          const text = readFileSync(candidate, "utf-8").toLowerCase();
          contentScore = terms.reduce((sum, term) => sum + (text.includes(term) ? 2 : 0), 0);
        } catch {
          contentScore = 0;
        }
      }

      return { relPath, score: pathScore + contentScore };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.relPath.localeCompare(b.relPath))
    .slice(0, 12);

  const unique = new Set<string>();
  const results: string[] = [];
  for (const entry of scored) {
    if (unique.has(entry.relPath)) continue;
    unique.add(entry.relPath);
    results.push(entry.relPath);
    if (results.length >= 6) break;
  }

  return results;
}

function buildCategoryNotes(category: string, target: string): string[] {
  switch (category) {
    case "screens":
      return ["Update the target screen/view implementation and any matching navigation title or route shell."];
    case "flows":
      return ["Update target flow wiring, sheet/modal presentation, and action handlers for this flow."];
    case "locales":
      return ["Update target localization resources so new or changed locale keys are available at runtime."];
    case "tokens":
      return ["Update target theme, style, or shared visual tokens if the spec change affects appearance or spacing semantics."];
    case "contracts":
      return ["Update shared target primitives/renderers that realize this contract family."];
    case "platform":
      return [`Update ${target}-specific shell, navigation, or platform override behavior.`];
    case "manifest":
      return ["Recheck app shell, routing, data wiring, and generation target assumptions from the project manifest."];
    default:
      return ["Review the semantic diff and update the target implementation accordingly."];
  }
}

function buildBootstrapNotes(category: string, target: string, specStatus: string | null): string[] {
  const notes = buildCategoryNotes(category, target);
  if (specStatus === "stub") {
    notes.unshift("This spec file is marked stub, so treat it as incomplete guidance during first-time generation.");
  } else if (specStatus === "draft") {
    notes.unshift("This spec file is draft quality. Generate conservatively and expect follow-up refinement.");
  } else if (specStatus === "ready") {
    notes.unshift("This spec file is ready and should be implemented in the initial target output.");
  }
  return notes;
}

function generationRules(target: string, outputDir: string, manifest: Record<string, any>, sharedLayers?: SharedLayerInfo[]): string[] {
  const outputFormat = manifest.generation?.output_format?.[target] ?? {};
  const rules = [
    "Read openuispec.yaml first, then follow the referenced spec files instead of inventing structure from memory.",
    "Implement every ready or draft screen and flow in the target output; treat stub screens and flows as incomplete guidance.",
    "Apply token files, locale resources, contracts, and platform overrides together so the generated target is internally consistent.",
    "Do not leave unresolved locale keys, token references, or placeholder assets in the generated UI.",
    `Write the generated ${target} output under ${outputDir}.`,
    `After the first accepted ${target} output exists, run \`openuispec drift --snapshot --target ${target}\` to baseline it.`,
  ];

  if (outputFormat.framework || outputFormat.language) {
    rules.unshift(
      `Target output must follow ${outputFormat.language ?? "the configured language"} / ${outputFormat.framework ?? "the configured framework"}.`
    );
  }

  if (sharedLayers && sharedLayers.length > 0) {
    for (const layer of sharedLayers) {
      if (layer.already_generated) {
        rules.push(
          `Shared layer "${layer.name}" already generated by ${layer.generated_by_target}. Read the existing code under ${layer.root} instead of regenerating it.`
        );
      } else {
        rules.push(
          `Generate shared layer "${layer.name}" (${layer.language}) under ${layer.root} alongside ${target} platform code.`
        );
      }
      if (layer.scope) {
        rules.push(
          `Shared layer "${layer.name}" scope: ${layer.scope}`
        );
      }
    }
  }

  // Include target structure scope when defined
  const structure = manifest.generation?.structure?.[target];
  if (structure?.scope) {
    rules.push(`Target "${target}" scope: ${structure.scope}`);
  }

  return rules;
}

function localizationConstraints(
  target: string,
  platformConfig?: Pick<PreparePlatformConfig, "framework">
): PrepareLocalizationConstraints {
  switch (target) {
    case "ios":
      return {
        must_use_platform_native_i18n: true,
        forbid_in_memory_string_maps: true,
        runtime_resources: [
          "Bundle-backed locale resources under Resources/<locale>.lproj/Localizable.strings",
        ],
        required_files: [
          "Resources/en.lproj/Localizable.strings",
          "Resources/<other-locale>.lproj/Localizable.strings",
        ],
        lookup_module_guidance:
          "Use SwiftUI/Foundation localization backed by bundle resources, not inline dictionaries or generated in-memory maps.",
        notes: [
          "Localized strings must resolve through the app bundle at runtime.",
          "Do not hardcode locale maps inside views, models, or app support files.",
        ],
      };
    case "android":
      return {
        must_use_platform_native_i18n: true,
        forbid_in_memory_string_maps: true,
        runtime_resources: [
          "Android string resources under app/src/main/res/values/strings.xml and locale-specific values-*/strings.xml",
        ],
        required_files: [
          "app/src/main/res/values/strings.xml",
          "app/src/main/res/values-<locale>/strings.xml",
        ],
        lookup_module_guidance:
          "Use Android string resources with stringResource/getString lookups, not Kotlin in-memory maps or constants tables.",
        notes: [
          "Localized resources must be packaged under res/values* so they participate in Android resource resolution.",
          "Do not leave locale content embedded inside composable files or support classes.",
        ],
      };
    case "web": {
      const fw = platformConfig?.framework;
      if (fw && !isKnownWebFramework(fw)) {
        return {
          must_use_platform_native_i18n: true,
          forbid_in_memory_string_maps: true,
          runtime_resources: [
            "File-backed locale resources such as src/locales/<locale>.json or framework-native message modules",
          ],
          required_files: [
            "src/locales/<locale>.json or equivalent file-backed locale resources",
            "A dedicated i18n module/provider wired through the selected web framework",
          ],
          lookup_module_guidance:
            "Use file-backed locale resources with a dedicated i18n module/provider, not inline maps in the root app shell, route modules, or screen/component files.",
          notes: [
            `The configured web framework (${fw}) is not a built-in preset, so this guidance stays framework-agnostic.`,
            "Locale files must be imported from dedicated resource files, not defined inline in UI components.",
          ],
        };
      }
      if (fw === "vue") {
        return {
          must_use_platform_native_i18n: true,
          forbid_in_memory_string_maps: true,
          runtime_resources: [
            "File-backed locale resources such as src/locales/<locale>.json loaded through vue-i18n",
          ],
          required_files: [
            "src/locales/<locale>.json or equivalent file-backed locale resources",
            "src/i18n.ts or equivalent vue-i18n setup module",
          ],
          lookup_module_guidance:
            "Use vue-i18n with file-backed locale resources, not inline string maps in App.vue or component files.",
          notes: [
            "Locale files must be imported from dedicated resource files, not defined inline in Vue components.",
            "The generated web app should support locale fallback through vue-i18n rather than ad hoc object lookups.",
          ],
        };
      }
      if (fw === "svelte") {
        return {
          must_use_platform_native_i18n: true,
          forbid_in_memory_string_maps: true,
          runtime_resources: [
            "File-backed locale resources such as src/lib/locales/<locale>.json or SvelteKit i18n modules",
          ],
          required_files: [
            "src/lib/locales/<locale>.json or equivalent file-backed locale resources",
            "src/lib/i18n.ts or equivalent dedicated i18n module",
          ],
          lookup_module_guidance:
            "Use file-backed locale resources with a dedicated i18n module, not inline string maps in +layout.svelte, +page.svelte, or component files.",
          notes: [
            "Locale files must be imported from dedicated resource files under src/lib/, not defined inline in Svelte components.",
            "The generated web app should support locale fallback through the i18n module rather than ad hoc object lookups.",
          ],
        };
      }
      return {
        must_use_platform_native_i18n: true,
        forbid_in_memory_string_maps: true,
        runtime_resources: [
          "File-backed locale resources such as src/locales/<locale>.json or generated message modules",
        ],
        required_files: [
          "src/locales/<locale>.json or equivalent file-backed locale resources",
          "src/i18n.ts or equivalent dedicated i18n module",
        ],
        lookup_module_guidance:
          "Use file-backed locale resources with a dedicated i18n module/provider, not a giant in-memory map inside App.tsx or screen/component files.",
        notes: [
          "Locale files must be imported from dedicated resource files, not defined inline in UI components.",
          "The generated web app should support locale fallback through the i18n module rather than ad hoc object lookups.",
        ],
      };
    }
    default:
      return {
        must_use_platform_native_i18n: true,
        forbid_in_memory_string_maps: true,
        runtime_resources: ["Use target-native runtime localization resources."],
        required_files: ["Create file-backed locale resources for each supported locale."],
        lookup_module_guidance:
          "Use the target's native localization system instead of inline string maps.",
        notes: [],
      };
  }
}

function fileStructureConstraints(
  target: string,
  platformConfig?: Pick<PreparePlatformConfig, "framework">
): PrepareFileStructureConstraints {
  switch (target) {
    case "ios":
      return {
        forbid_single_file_output: true,
        required_directories: [
          "Sources/<Project>/App",
          "Sources/<Project>/Screens",
          "Sources/<Project>/Components",
          "Sources/<Project>/Models",
          "Sources/<Project>/Support",
          "Resources",
        ],
        screen_split_rule: "Generate one primary screen/view per file under Sources/<Project>/Screens.",
        component_split_rule: "Place reusable UI primitives and shared subviews under Sources/<Project>/Components instead of keeping them in a monolithic screen file.",
        notes: [
          "The app entry file may stay separate, but it must not contain the full app implementation.",
          "Models, support logic, and screens should live in separate files and folders.",
        ],
      };
    case "android":
      return {
        forbid_single_file_output: true,
        required_directories: [
          "app/src/main/java/<package>/ui/screens",
          "app/src/main/java/<package>/ui/components",
          "app/src/main/java/<package>/model",
          "app/src/main/java/<package>/support",
          "app/src/main/res",
        ],
        screen_split_rule: "Generate one primary screen composable file per screen under ui/screens.",
        component_split_rule: "Put reusable composables under ui/components and keep models/support logic out of screen files.",
        notes: [
          "Do not place every screen, component, and model into a single Kotlin source file.",
          "Resource XML, models, and UI code should remain separated.",
        ],
      };
    case "web": {
      const fw = platformConfig?.framework;
      if (fw && !isKnownWebFramework(fw)) {
        return {
          forbid_single_file_output: true,
          required_directories: [
            "src/routes or framework-appropriate screen modules",
            "src/components",
            "src/locales or generated messages",
            "src/state, src/store, or framework-specific state modules",
            "src",
          ],
          screen_split_rule:
            "Generate one primary route/screen module per screen in the framework-appropriate location rather than embedding the entire app in a single root file.",
          component_split_rule:
            "Put reusable components in dedicated component modules and keep state/i18n/helpers in separate support files.",
          notes: [
            `The configured web framework (${fw}) is not a built-in preset, so file layout guidance is framework-agnostic.`,
            "The root app shell may compose providers and routing, but it must not contain the entire generated application.",
          ],
        };
      }
      if (fw === "vue") {
        return {
          forbid_single_file_output: true,
          required_directories: [
            "src/views or src/pages",
            "src/components",
            "src/locales",
            "src/stores",
            "src",
          ],
          screen_split_rule: "Generate one Vue SFC per screen under src/views rather than embedding all screens in App.vue.",
          component_split_rule: "Put reusable components under src/components and keep stores/i18n helpers in separate modules.",
          notes: [
            "App.vue may compose the app shell with router-view, but it must not contain the entire generated application.",
            "Pinia stores, composables, and locale resources should live outside view/component files.",
          ],
        };
      }
      if (fw === "svelte") {
        return {
          forbid_single_file_output: true,
          required_directories: [
            "src/routes",
            "src/lib/components",
            "src/lib/locales",
            "src/lib/stores",
            "src/lib",
          ],
          screen_split_rule: "Generate one +page.svelte per screen under src/routes following SvelteKit file-based routing.",
          component_split_rule: "Put reusable components under src/lib/components and keep stores/i18n helpers in src/lib/.",
          notes: [
            "+layout.svelte may compose the app shell, but it must not contain the entire generated application.",
            "Svelte stores, helpers, and locale resources should live under src/lib/ outside route files.",
          ],
        };
      }
      return {
        forbid_single_file_output: true,
        required_directories: [
          "src/screens",
          "src/components",
          "src/locales or src/generated",
          "src/state or src/store",
          "src",
        ],
        screen_split_rule: "Generate one screen module per screen under src/screens rather than embedding all screens in App.tsx.",
        component_split_rule: "Put reusable components under src/components and keep state/i18n helpers in separate modules.",
        notes: [
          "App.tsx may compose the app shell, but it must not contain the entire generated application.",
          "Shared state, helpers, and generated resources should live outside screen/component files.",
        ],
      };
    }
    default:
      return {
        forbid_single_file_output: true,
        required_directories: ["Create separate directories for screens, components, resources, and support code."],
        screen_split_rule: "Generate one screen per file.",
        component_split_rule: "Keep reusable components separate from screens.",
        notes: [],
      };
  }
}

function generationConstraints(target: string, platformConfig: PreparePlatformConfig): PrepareGenerationConstraints {
  return {
    localization: localizationConstraints(target, platformConfig),
    file_structure: fileStructureConstraints(target, platformConfig),
    platform_setup: {
      refresh_target_platform_knowledge: true,
      notes: [
        `Refresh current ${target} platform/framework setup guidance before generation instead of relying on stale memory.`,
        "Check current project scaffolding, resource wiring, navigation APIs, packaging rules, and other toolchain-sensitive conventions for this target.",
      ],
    },
  };
}

const PRESENTATION_ONLY_KEYS = new Set(["naming", "bundler", "css"]);

function requiredPlatformDecisionKeys(target: string): string[] {
  return platformStackKeys(target).filter((key) => !PRESENTATION_ONLY_KEYS.has(key));
}

function missingPlatformDecisions(target: string, platformDef: Record<string, any>): string[] {
  const generation = platformDef.generation ?? {};
  return requiredPlatformDecisionKeys(target).filter((key) => {
    const value = generation[key];
    return typeof value !== "string" || value.trim().length === 0;
  });
}

function referenceExamples(): string[] {
  const packageRoot = resolvePackageRoot();
  const candidates = [
    join(packageRoot, "README.md"),
    join(packageRoot, "spec", "openuispec-v0.2.md"),
    join(packageRoot, "examples", "taskflow", "openuispec"),
    join(packageRoot, "schema"),
  ];

  return candidates.filter((candidate) => existsSync(candidate));
}

function generationWarnings(target: string, platformConfig: PreparePlatformConfig): string[] {
  const warnings: string[] = [];

  if (platformConfig.stack_confirmation.requires_user_confirmation) {
    warnings.push(
      `The configured ${target} stack was applied from defaults and still requires explicit user confirmation before implementation.`
    );
  }

  for (const [key, value] of Object.entries(platformConfig.stack)) {
    if (!PRESENTATION_ONLY_KEYS.has(key) && !platformConfig.selected_option_refs[key]) {
      warnings.push(
        `The configured ${target} ${key} value "${value}" is custom or not covered by the preset catalog, so automatic dependency guidance is unavailable for that choice.`
      );
    }
  }

  if (target === "web" && platformConfig.framework && !isKnownWebFramework(platformConfig.framework)) {
    warnings.push(
      `The configured web framework "${platformConfig.framework}" is custom, so bootstrap generation constraints are framework-agnostic instead of React-specific.`
    );
  }

  return warnings;
}

function readAllSpecContents(projectDir: string): SpecFileContent[] {
  return discoverSpecFiles(projectDir).map((filePath) => {
    const relPath = relative(projectDir, filePath);
    return {
      path: relPath,
      category: categorizeSpecFile(relPath),
      content: readFileSync(filePath, "utf-8"),
    };
  });
}

function bootstrapSpecFiles(projectDir: string, target: string): BootstrapSpecFile[] {
  return discoverSpecFiles(projectDir)
    .map((filePath) => {
      const relPath = relative(projectDir, filePath);
      const specStatus = hasStatusSemantics(relPath) ? readStatus(filePath) : null;
      const category = categorizeSpecFile(relPath);
      return {
        spec_file: relPath,
        category,
        spec_status: specStatus,
        notes: buildBootstrapNotes(category, target, specStatus),
      };
    })
    .sort((a, b) => a.category.localeCompare(b.category) || a.spec_file.localeCompare(b.spec_file));
}

function explanationItems(
  explanation: ExplainResult | undefined,
  outputDir: string,
  codeRoots: string[],
  target: string
): PrepareItem[] {
  if (!explanation?.available) return [];

  return explanation.files.map((file) => ({
    spec_file: file.file,
    category: categorizeSpecFile(file.file),
    status: file.status,
    semantic_changes: file.changes,
    likely_files: searchLikelyFiles(outputDir, codeRoots, file),
    notes: buildCategoryNotes(categorizeSpecFile(file.file), target),
  }));
}

function printReport(result: PrepareResult): void {
  console.log("OpenUISpec Prepare");
  console.log("==================");
  console.log(`Project: ${result.project}`);
  console.log(`Target: ${result.target}`);
  console.log(`Mode: ${result.mode}`);
  console.log(`Output: ${result.output_dir}`);
  if (result.backend_root) {
    console.log(`Backend: ${result.backend_root}`);
  }

  const platformLabel = [result.platform_config.language, result.platform_config.framework]
    .filter(Boolean)
    .join(" / ");
  if (platformLabel) {
    console.log(`Platform: ${platformLabel}`);
  }

  if (result.baseline.commit) {
    const shortCommit = result.baseline.commit.slice(0, 12);
    const branch = result.baseline.branch ? ` on ${result.baseline.branch}` : "";
    console.log(`Baseline: ${shortCommit}${branch} (${result.baseline.kind ?? "unknown"})`);
  }

  console.log(
    `Summary: ${result.summary.changed} changed, ${result.summary.added} added, ${result.summary.removed} removed`
  );

  if (Object.keys(result.platform_config.stack).length > 0 || result.platform_config.dependencies.length > 0) {
    console.log("\nPlatform Stack");
    for (const [key, value] of Object.entries(result.platform_config.stack)) {
      console.log(`  ${key}: ${value}`);
    }
    if (Object.keys(result.platform_config.selected_option_refs).length > 0) {
      console.log("  selected option refs:");
      for (const [key, refs] of Object.entries(result.platform_config.selected_option_refs)) {
        console.log(`    - ${key}: ${refs.value}`);
      }
    }
    if (result.platform_config.stack_confirmation.status) {
      console.log(`  stack confirmation: ${result.platform_config.stack_confirmation.status}`);
    }
    if (result.platform_config.dependency_guidance.notes.length > 0) {
      console.log("  dependency guidance:");
      for (const note of result.platform_config.dependency_guidance.notes) {
        console.log(`    - ${note}`);
      }
    }
    if (result.platform_config.dependencies.length > 0) {
      console.log("  dependencies:");
      for (const dependency of result.platform_config.dependencies) {
        console.log(`    - ${dependency}`);
      }
    }
  }

  if (result.mode === "bootstrap" && result.bootstrap) {
    console.log("\nBootstrap Bundle");
    console.log(`  output exists: ${result.bootstrap.output_exists ? "yes" : "no"}`);
    console.log(`  generation ready: ${result.bootstrap.generation_ready ? "yes" : "no"}`);
    console.log(
      `  pending user confirmation: ${result.bootstrap.pending_user_confirmation ? "yes" : "no"}`
    );

    if (result.bootstrap.missing_platform_decisions.length > 0) {
      console.log("  missing platform decisions:");
      for (const key of result.bootstrap.missing_platform_decisions) {
        console.log(`    - ${key}`);
      }
    }

    if (result.bootstrap.target_stack_options) {
      console.log("  target stack options:");
      console.log(`    - interactive: ${result.bootstrap.target_stack_options.interactive_command}`);
      console.log(`    - non-interactive schema: openuispec configure-target ${result.target} --list-options`);
    }

    if (result.bootstrap.generation_warnings.length > 0) {
      console.log("  generation warnings:");
      for (const warning of result.bootstrap.generation_warnings) {
        console.log(`    - ${warning}`);
      }
    }

    if (result.code_roots.length > 0) {
      console.log("  code roots:");
      for (const root of result.code_roots) {
        console.log(`    - ${root}`);
      }
    }

    console.log("  spec files:");
    for (const file of result.bootstrap.spec_files) {
      const statusLabel = file.spec_status ? ` [${file.spec_status}]` : "";
      console.log(`    - ${file.spec_file} (${file.category})${statusLabel}`);
    }

    console.log("  generation rules:");
    for (const rule of result.bootstrap.generation_rules) {
      console.log(`    - ${rule}`);
    }

    console.log("  generation constraints:");
    console.log(
      `    - localization: native i18n required = ${result.bootstrap.generation_constraints.localization.must_use_platform_native_i18n ? "yes" : "no"}`
    );
    console.log(
      `    - localization: forbid in-memory maps = ${result.bootstrap.generation_constraints.localization.forbid_in_memory_string_maps ? "yes" : "no"}`
    );
    console.log(
      `    - file structure: forbid single-file output = ${result.bootstrap.generation_constraints.file_structure.forbid_single_file_output ? "yes" : "no"}`
    );
    console.log(
      `    - platform setup: refresh target knowledge = ${result.bootstrap.generation_constraints.platform_setup.refresh_target_platform_knowledge ? "yes" : "no"}`
    );

    console.log("  references:");
    for (const ref of result.bootstrap.reference_examples) {
      console.log(`    - ${ref}`);
    }
  } else if (!result.changes_available) {
    console.log(`\n${result.explanation_note ?? "No semantic changes available."}`);
  } else if (result.items.length === 0) {
    console.log("\nNo target updates are currently required from spec drift.");
  } else {
    console.log("\nCode Roots");
    for (const root of result.code_roots) {
      console.log(`  - ${root}`);
    }

    console.log("\nWork Items");
    for (const item of result.items) {
      console.log(`\n${item.spec_file}`);
      for (const change of item.semantic_changes) {
        const pathLabel = change.path || "(root)";
        if (change.kind === "added") {
          console.log(`  + ${pathLabel}${change.after ? ` = ${change.after}` : ""}`);
        } else if (change.kind === "removed") {
          console.log(`  - ${pathLabel}${change.before ? ` (was ${change.before})` : ""}`);
        } else {
          console.log(`  ~ ${pathLabel}: ${change.before ?? "?"} -> ${change.after ?? "?"}`);
        }
      }

      if (item.likely_files.length > 0) {
        console.log("  likely target files:");
        for (const file of item.likely_files) {
          console.log(`    - ${file}`);
        }
      }

      for (const note of item.notes) {
        console.log(`  note: ${note}`);
      }
    }
  }

  console.log("\nNext Steps");
  for (const step of result.next_steps) {
    console.log(`  - ${step}`);
  }
}

function buildBootstrapPrepareResult(cwd: string, target: string, includeContents: boolean = false): PrepareResult {
  const projectDir = findProjectDir(cwd);
  const projectName = readProjectName(projectDir);
  const outputDir = resolveOutputDir(projectDir, projectName, target);
  const manifest = readManifest(projectDir);
  const platformDef = readPlatformDefinition(projectDir, manifest, target);
  const platformConfig = buildPlatformConfig(target, platformDef);
  const outputFormat = manifest.generation?.output_format?.[target] ?? {};
  const sharedLayerConfigs = sharedLayersForTarget(projectDir, target);
  const codeRoots = suggestCodeRoots(target, outputDir, projectDir, sharedLayerConfigs);
  const missingDecisions = missingPlatformDecisions(target, platformDef);
  const sharedLayerInfos = buildSharedLayerInfos(projectDir, target, sharedLayerConfigs);
  const backendRoot = resolveBackendRoot(projectDir, manifest);
  const backendContextReady = true; // backend is optional — not a generation blocker
  const pendingUserConfirmation = platformConfig.stack_confirmation.requires_user_confirmation;

  const nextSteps = [
    ...(hasApiEndpoints(manifest) && (backendRoot === null || !existsSync(backendRoot))
      ? [
          "Optional: set `generation.code_roots.backend` in openuispec.yaml to help AI locate your backend code.",
        ]
      : []),
    ...(pendingUserConfirmation
      ? [
          `Run \`openuispec configure-target ${target}\` without \`--defaults\` and confirm the stack choices before implementation.`,
        ]
      : []),
    ...(missingDecisions.length > 0
      ? [
          `Run \`openuispec configure-target ${target}\` to choose the missing ${target} stack defaults before generation.`,
        ]
      : []),
    `Read the manifest and referenced ${target} spec files from this bundle before generating target code.`,
    ...(missingDecisions.length === 0
      ? [
          `Generate the initial ${target} implementation in ${outputDir}.`,
          "Build or run the generated target and review screens, flows, and localization wiring.",
          `After the first accepted ${target} output exists, run \`openuispec drift --snapshot --target ${target}\` to baseline it.`,
        ]
      : []),
  ];

  if (outputFormat.framework || outputFormat.language) {
    nextSteps.unshift(
      `Target mapping context: ${outputFormat.language ?? "unknown language"} / ${outputFormat.framework ?? "unknown framework"}.`
    );
  }

  const outputDirExists = existsSync(outputDir);
  const snapshotPath = join(outputDir, ".openuispec-state.json");
  const snapshotFileExists = existsSync(snapshotPath);

  return {
    mode: "bootstrap",
    project: projectName,
    target,
    output_dir: outputDir,
    backend_root: backendRoot,
    platform_config: platformConfig,
    code_roots: codeRoots,
    baseline: {
      kind: null,
      commit: null,
      branch: null,
    },
    baseline_status: {
      output_exists: outputDirExists,
      snapshot_exists: snapshotFileExists,
      action_needed: outputDirExists && !snapshotFileExists
        ? `Baseline pending — when satisfied with the generated output, run: openuispec drift --snapshot --target ${target}`
        : null,
    },
    summary: {
      changed: 0,
      added: 0,
      removed: 0,
    },
    changes_available: false,
    explanation_note: "No snapshot exists yet. This is a first-time generation bundle.",
    items: [],
    ...(sharedLayerInfos.length > 0 ? { shared_layers: sharedLayerInfos } : {}),
    ...(includeContents ? { spec_contents: readAllSpecContents(projectDir) } : {}),
    bootstrap: {
      output_exists: existsSync(outputDir),
      generation_ready: missingDecisions.length === 0 && backendContextReady && !pendingUserConfirmation,
      missing_platform_decisions: missingDecisions,
      pending_user_confirmation: pendingUserConfirmation,
      includes: manifest.includes ?? {},
      target_stack_options:
        (missingDecisions.length > 0 || pendingUserConfirmation) && isSupportedTarget(target)
          ? listTargetWizardOptions(target)
          : null,
      output_format: outputFormat,
      i18n: {
        default_locale: manifest.i18n?.default_locale ?? null,
        supported_locales: manifest.i18n?.supported_locales ?? [],
      },
      spec_files: bootstrapSpecFiles(projectDir, target),
      generation_rules: generationRules(target, outputDir, manifest, sharedLayerInfos),
      generation_constraints: generationConstraints(target, platformConfig),
      generation_warnings: generationWarnings(target, platformConfig),
      reference_examples: referenceExamples(),
    },
    next_steps: nextSteps,
  };
}

function buildUpdatePrepareResult(cwd: string, target: string, includeContents: boolean = false): PrepareResult {
  const { projectDir, projectName, result } = loadTargetDrift(cwd, target, false, true);
  const outputDir = resolveOutputDir(projectDir, projectName, target);
  const sharedLayerConfigs = sharedLayersForTarget(projectDir, target);
  const codeRoots = suggestCodeRoots(target, outputDir, projectDir, sharedLayerConfigs);
  const manifest = readManifest(projectDir);
  const sharedLayerInfos = buildSharedLayerInfos(projectDir, target, sharedLayerConfigs);
  const platformDef = readPlatformDefinition(projectDir, manifest, target);
  const platformConfig = buildPlatformConfig(target, platformDef);
  const outputFormat = manifest.generation?.output_format?.[target] ?? {};
  const backendRoot = resolveBackendRoot(projectDir, manifest);
  const items = explanationItems(result.explanation, outputDir, codeRoots, target);

  const nextSteps = [
    `Update the ${target} implementation in ${outputDir} to match the semantic changes above.`,
    "Build or run the target and review the affected screens/flows.",
    `After the UI is updated, run \`openuispec drift --snapshot --target ${target}\` to accept the new baseline.`,
    `Run \`openuispec drift --target ${target} --explain\` again to confirm no spec changes remain for this target.`,
  ];

  if (outputFormat.framework || outputFormat.language) {
    nextSteps.unshift(
      `Target mapping context: ${outputFormat.language ?? "unknown language"} / ${outputFormat.framework ?? "unknown framework"}.`
    );
  }

  return {
    mode: "update",
    project: projectName,
    target,
    output_dir: outputDir,
    backend_root: backendRoot,
    platform_config: platformConfig,
    code_roots: codeRoots,
    baseline: {
      kind: result.state.baseline?.kind ?? null,
      commit: result.state.baseline?.commit ?? null,
      branch: result.state.baseline?.branch ?? null,
    },
    summary: {
      changed: result.drift.changed.length,
      added: result.drift.added.length,
      removed: result.drift.removed.length,
    },
    changes_available: result.explanation?.available ?? false,
    explanation_note: result.explanation?.note,
    items,
    ...(sharedLayerInfos.length > 0 ? { shared_layers: sharedLayerInfos } : {}),
    ...(includeContents ? { spec_contents: readAllSpecContents(projectDir) } : {}),
    next_steps: nextSteps,
  };
}

export function buildPrepareResult(target: string, cwd: string = process.cwd(), includeContents: boolean = false): PrepareResult {
  const projectDir = findProjectDir(cwd);
  const projectName = readProjectName(projectDir);
  const outputDir = resolveOutputDir(projectDir, projectName, target);
  const statePath = join(outputDir, ".openuispec-state.json");
  if (!existsSync(statePath)) {
    return buildBootstrapPrepareResult(cwd, target, includeContents);
  }
  return buildUpdatePrepareResult(cwd, target, includeContents);
}

export function runPrepare(argv: string[]): void {
  const isJson = argv.includes("--json");
  const targetIdx = argv.indexOf("--target");
  const target = targetIdx !== -1 && argv[targetIdx + 1] ? argv[targetIdx + 1] : null;

  if (!target) {
    console.error("Error: --target is required for prepare");
    console.error("Usage: openuispec prepare --target <target> [--json]");
    process.exit(1);
  }

  const result = buildPrepareResult(target);
  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  printReport(result);
}

const isDirectRun =
  process.argv[1]?.endsWith("prepare/index.ts") ||
  process.argv[1]?.endsWith("prepare/index.js");

if (isDirectRun) {
  runPrepare(process.argv.slice(2));
}
