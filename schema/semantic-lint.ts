import { existsSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import YAML from "yaml";
import { listFiles, readManifest } from "../drift/index.js";

type UnknownRecord = Record<string, unknown>;

export interface Includes {
  tokens: string;
  contracts: string;
  screens: string;
  flows: string;
  platform: string;
  locales: string;
}

export interface UsageLint {
  path: string;
  message: string;
  severity?: "error" | "warning";
}

interface SemanticContext {
  manifest: unknown;
  localeFiles: Map<string, Set<string>>;
  formatterNames: Set<string>;
  mapperNames: Set<string>;
  contractNames: Set<string>;
  tokenRefs: Set<string>;
  iconRefs: Set<string>;
  iconVariantSuffixes: string[];
  screenRefs: Set<string>;
  flowRefs: Set<string>;
  apiRefs: Set<string>;
  defaultLocale: string | null;
}

const BUILTIN_CONTRACTS = new Set([
  "nav_container",
  "surface",
  "action_trigger",
  "input_field",
  "data_display",
  "collection",
  "feedback",
]);

const BUILTIN_FORMATTERS = new Set([
  "date",
  "time",
  "datetime",
  "date_relative",
  "currency",
  "number",
  "percent",
  "boolean",
  "duration",
]);

function loadJson(filePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(filePath, "utf-8")) as Record<string, unknown>;
}

function loadYaml(filePath: string): unknown {
  return YAML.parse(readFileSync(filePath, "utf-8"));
}

function loadData(filePath: string): unknown {
  return filePath.endsWith(".json") ? loadJson(filePath) : loadYaml(filePath);
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getSingleRootValue(data: unknown): unknown {
  if (!isRecord(data)) return undefined;
  const values = Object.values(data);
  return values.length === 1 ? values[0] : undefined;
}

function rootKeys(filePath: string): string[] {
  const data = loadData(filePath);
  if (!isRecord(data)) return [];
  return Object.keys(data);
}

function addNestedObjectKeys(prefix: string, value: unknown, refs: Set<string>): void {
  if (!isRecord(value)) return;
  for (const [key, nested] of Object.entries(value)) {
    const next = `${prefix}.${key}`;
    refs.add(next);
    addNestedObjectKeys(next, nested, refs);
  }
}

function collectTokenRefs(root: string, value: unknown, refs: Set<string>): void {
  if (!root || !isRecord(value)) return;
  refs.add(root);

  if (root === "spacing") {
    for (const group of ["scale", "aliases"]) {
      const groupValue = value[group];
      if (!isRecord(groupValue)) continue;
      for (const [key, nested] of Object.entries(groupValue)) {
        const ref = `${root}.${key}`;
        refs.add(ref);
        addNestedObjectKeys(ref, nested, refs);
      }
    }
    return;
  }

  if (root === "typography") {
    for (const group of ["scale", "font_family"]) {
      const groupValue = value[group];
      if (!isRecord(groupValue)) continue;
      for (const [key, nested] of Object.entries(groupValue)) {
        const ref = group === "scale" ? `${root}.${key}` : `${root}.${group}.${key}`;
        refs.add(ref);
        addNestedObjectKeys(ref, nested, refs);
      }
    }
    return;
  }

  if (root === "elevation") {
    for (const [key, nested] of Object.entries(value)) {
      const ref = `${root}.${key}`;
      refs.add(ref);
      addNestedObjectKeys(ref, nested, refs);
    }
    return;
  }

  if (root === "color") {
    addNestedObjectKeys(root, value, refs);
  }
}

function collectApiRefs(prefix: string, value: unknown, refs: Set<string>): void {
  if (!isRecord(value)) return;

  const looksLikeEndpoint = typeof value.method === "string" || typeof value.path === "string";
  if (looksLikeEndpoint && prefix) {
    refs.add(`api.${prefix}`);
  }

  for (const [key, nested] of Object.entries(value)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    collectApiRefs(nextPrefix, nested, refs);
  }
}

function iconNameWithVariant(name: string, variant: string): string {
  if (!variant) return name;
  if (variant.startsWith("_")) return `${name}${variant}`;
  return `${name}_${variant}`;
}

function collectIconRefs(filePath: string): { refs: Set<string>; suffixes: string[] } {
  const refs = new Set<string>();
  const suffixes: string[] = [];
  const data = loadData(filePath);
  if (!isRecord(data) || !isRecord(data.icons)) return { refs, suffixes };

  const icons = data.icons as UnknownRecord;
  const variantSuffixes = isRecord(icons.variants?.suffixes) ? icons.variants.suffixes : {};
  for (const suffix of Object.keys(variantSuffixes)) {
    if (suffix.trim()) suffixes.push(suffix);
  }

  const registerEntry = (name: string, value: unknown) => {
    refs.add(name);
    if (!isRecord(value)) return;
    if (Array.isArray(value.variants)) {
      for (const variant of value.variants) {
        if (typeof variant === "string" && variant.trim()) {
          refs.add(iconNameWithVariant(name, variant));
        }
      }
    }
  };

  const registry = isRecord(icons.registry) ? icons.registry : {};
  for (const groupValue of Object.values(registry)) {
    if (!isRecord(groupValue)) continue;
    for (const [name, value] of Object.entries(groupValue)) {
      registerEntry(name, value);
    }
  }

  const custom = isRecord(icons.custom) ? icons.custom : {};
  for (const namespaceValue of Object.values(custom)) {
    if (!isRecord(namespaceValue)) continue;
    for (const [name, value] of Object.entries(namespaceValue)) {
      registerEntry(name, value);
    }
  }

  if (typeof icons.fallback?.missing_icon === "string") {
    refs.add(icons.fallback.missing_icon);
  }

  return { refs, suffixes };
}

function buildContext(projectDir: string, includes: Includes, manifest: UnknownRecord): SemanticContext {

  const localeDir = resolve(projectDir, includes.locales);
  const localeFiles = new Map<string, Set<string>>();
  for (const filePath of listFiles(localeDir, ".json")) {
    const localeName = basename(filePath, ".json");
    const data = loadJson(filePath);
    localeFiles.set(localeName, new Set(Object.keys(data)));
  }

  const formatterNames = new Set<string>([
    ...BUILTIN_FORMATTERS,
    ...(isRecord(manifest.formatters) ? Object.keys(manifest.formatters) : []),
  ]);
  const mapperNames = new Set<string>(isRecord(manifest.mappers) ? Object.keys(manifest.mappers) : []);

  const contractNames = new Set<string>(BUILTIN_CONTRACTS);
  const contractsDir = resolve(projectDir, includes.contracts);
  for (const filePath of listFiles(contractsDir, ".yaml")) {
    for (const key of rootKeys(filePath)) {
      contractNames.add(key);
    }
  }

  const tokenRefs = new Set<string>();
  const tokensDir = resolve(projectDir, includes.tokens);
  for (const filePath of listFiles(tokensDir, ".yaml")) {
    const data = loadData(filePath);
    if (!isRecord(data)) continue;
    for (const [root, value] of Object.entries(data)) {
      collectTokenRefs(root, value, tokenRefs);
    }
  }

  const iconsPath = join(tokensDir, "icons.yaml");
  const iconData = existsSync(iconsPath)
    ? collectIconRefs(iconsPath)
    : { refs: new Set<string>(), suffixes: [] };

  const screenRefs = new Set<string>();
  const screensDir = resolve(projectDir, includes.screens);
  for (const filePath of listFiles(screensDir, ".yaml")) {
    for (const key of rootKeys(filePath)) {
      screenRefs.add(`screens/${key}`);
    }
  }

  const flowRefs = new Set<string>();
  const flowsDir = resolve(projectDir, includes.flows);
  for (const filePath of listFiles(flowsDir, ".yaml")) {
    for (const key of rootKeys(filePath)) {
      flowRefs.add(`flows/${key}`);
    }
  }

  const apiRefs = new Set<string>();
  if (isRecord(manifest.api) && isRecord(manifest.api.endpoints)) {
    collectApiRefs("", manifest.api.endpoints, apiRefs);
  }

  const defaultLocale =
    isRecord(manifest.i18n) && typeof manifest.i18n.default_locale === "string"
      ? manifest.i18n.default_locale
      : localeFiles.keys().next().value ?? null;

  return {
    manifest,
    localeFiles,
    formatterNames,
    mapperNames,
    contractNames,
    tokenRefs,
    iconRefs: iconData.refs,
    iconVariantSuffixes: iconData.suffixes,
    screenRefs,
    flowRefs,
    apiRefs,
    defaultLocale,
  };
}

function missingLocalesForKey(context: SemanticContext, key: string): string[] {
  const missing: string[] = [];
  for (const [locale, keys] of context.localeFiles.entries()) {
    if (!keys.has(key)) missing.push(locale);
  }
  return missing.sort();
}

function validateLocaleRef(value: string, path: string, context: SemanticContext, errors: UsageLint[]): void {
  const ref = value.slice(3);
  if (!ref) return;

  if (!ref.includes("{")) {
    const missing = missingLocalesForKey(context, ref);
    if (missing.length > 0) {
      errors.push({
        path,
        message: `locale key "${ref}" is missing in locale(s): ${missing.join(", ")}`,
      });
    }
    return;
  }

  const staticPrefix = ref.split("{", 1)[0];
  if (staticPrefix) {
    const hasMatch = Array.from(context.localeFiles.values()).some((keys) =>
      Array.from(keys).some((key) => key.startsWith(staticPrefix))
    );
    if (!hasMatch) {
      errors.push({
        path,
        message: `dynamic locale key prefix "${staticPrefix}" does not match any locale entry`,
      });
    }
  }

  for (const formatter of extractFormatterRefs(ref)) {
    if (!context.formatterNames.has(formatter)) {
      errors.push({
        path,
        message: `unknown formatter "${formatter}" used inside locale key reference`,
      });
    }
  }
}

function extractFormatterRefs(value: string): string[] {
  const refs = new Set<string>();
  const regex = /\|\s*format:([A-Za-z0-9_.-]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(value)) !== null) {
    const name = match[1].split(".", 1)[0];
    if (name) refs.add(name);
  }
  return Array.from(refs);
}

function extractMapperRefs(value: string): string[] {
  const refs = new Set<string>();
  const regex = /\|\s*map:([A-Za-z0-9_.-]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(value)) !== null) {
    if (match[1]) refs.add(match[1]);
  }
  return Array.from(refs);
}

function maybeTokenRef(value: string): boolean {
  return /^(color|typography|spacing|elevation)\./.test(value);
}

function isDynamicReference(value: string): boolean {
  return value.includes("{") || value.includes("}");
}

function isKnownIconRef(value: string, context: SemanticContext): boolean {
  if (context.iconRefs.has(value)) return true;
  for (const suffix of context.iconVariantSuffixes) {
    if (value.endsWith(suffix)) {
      const base = value.slice(0, -suffix.length);
      if (context.iconRefs.has(base)) return true;
    }
  }
  return false;
}

function validateStringValue(
  key: string | null,
  value: string,
  path: string,
  context: SemanticContext,
  formIds: Set<string>,
  errors: UsageLint[],
  options: { validateTokens: boolean }
): void {
  if (value.startsWith("$t:")) {
    validateLocaleRef(value, path, context, errors);
  }

  for (const formatter of extractFormatterRefs(value)) {
    if (!context.formatterNames.has(formatter)) {
      errors.push({ path, message: `unknown formatter "${formatter}"` });
    }
  }

  for (const mapper of extractMapperRefs(value)) {
    if (!context.mapperNames.has(mapper)) {
      errors.push({ path, message: `unknown mapper "${mapper}"` });
    }
  }

  if (options.validateTokens && maybeTokenRef(value) && !isDynamicReference(value) && !context.tokenRefs.has(value)) {
    errors.push({ path, message: `unknown token reference "${value}"` });
  }

  if ((key === "contract" || key === "item_contract") && !context.contractNames.has(value)) {
    errors.push({ path, message: `unknown contract "${value}"` });
  }

  if (
    (key === "icon" || key === "icon_active") &&
    !isDynamicReference(value) &&
    !value.includes(".") &&
    !isKnownIconRef(value, context)
  ) {
    errors.push({ path, message: `unknown icon "${value}"` });
  }

  if ((key === "source" || key === "endpoint") && value.startsWith("api.") && !context.apiRefs.has(value)) {
    errors.push({ path, message: `unknown API reference "${value}"` });
  }

  if (key === "destination" && value !== "$back") {
    if (value.startsWith("screens/") && !context.screenRefs.has(value)) {
      errors.push({ path, message: `unknown screen destination "${value}"` });
    } else if (value.startsWith("flows/") && !context.flowRefs.has(value)) {
      errors.push({ path, message: `unknown flow destination "${value}"` });
    }
  }

  if (key === "target" && value.startsWith("screens/")) {
    const screenTarget = value.split(".", 1)[0];
    if (!context.screenRefs.has(screenTarget)) {
      errors.push({ path, message: `unknown screen target "${value}"` });
    }
  }

  if (key === "form_id" && !formIds.has(value)) {
    errors.push({ path, message: `unknown form_id "${value}" in submit action` });
  }
}

function collectFormIds(value: unknown, formIds: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectFormIds(item, formIds);
    return;
  }
  if (!isRecord(value)) return;

  if (typeof value.form_id === "string" && value.form_id.trim()) {
    formIds.add(value.form_id);
  }

  for (const nested of Object.values(value)) {
    collectFormIds(nested, formIds);
  }
}

function traverse(
  value: unknown,
  path: string,
  context: SemanticContext,
  formIds: Set<string>,
  errors: UsageLint[],
  key: string | null = null,
  options: { validateTokens: boolean }
): void {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      traverse(item, `${path}/${index}`, context, formIds, errors, key, options);
    }
    return;
  }

  if (typeof value === "string") {
    validateStringValue(key, value, path, context, formIds, errors, options);
    return;
  }

  if (!isRecord(value)) return;

  if (
    key === "icon" &&
    typeof value.ref === "string" &&
    !isDynamicReference(value.ref) &&
    !value.ref.includes(".") &&
    !isKnownIconRef(value.ref, context)
  ) {
    errors.push({ path: `${path}/ref`, message: `unknown icon "${value.ref}"` });
  }

  if (key === "sections") {
    for (const [index, entry] of Object.entries(value)) {
      if (typeof entry === "string" && entry.startsWith("screens/") && !context.screenRefs.has(entry)) {
        errors.push({
          path: `${path}/${index}`,
          message: `unknown screen section reference "${entry}"`,
        });
      }
    }
  }

  for (const [childKey, nested] of Object.entries(value)) {
    traverse(nested, `${path}/${childKey}`, context, formIds, errors, childKey, options);
  }
}

function lintFile(
  filePath: string,
  context: SemanticContext,
  options: { validateTokens: boolean }
): UsageLint[] {
  const data = loadData(filePath);
  const formIds = new Set<string>();
  collectFormIds(data, formIds);

  const errors: UsageLint[] = [];
  traverse(data, basename(filePath), context, formIds, errors, null, options);
  return errors;
}

function lintLocaleCoverage(context: SemanticContext): UsageLint[] {
  const errors: UsageLint[] = [];
  if (context.localeFiles.size <= 1) return errors;

  const baselineLocale =
    (context.defaultLocale && context.localeFiles.has(context.defaultLocale) && context.defaultLocale) ||
    Array.from(context.localeFiles.keys())[0];
  if (!baselineLocale) return errors;

  const baselineKeys = context.localeFiles.get(baselineLocale) ?? new Set<string>();
  for (const [locale, keys] of context.localeFiles.entries()) {
    if (locale === baselineLocale) continue;

    for (const key of baselineKeys) {
      if (!keys.has(key)) {
        errors.push({
          path: `${locale}.json`,
          message: `missing locale key "${key}" from baseline locale "${baselineLocale}"`,
        });
      }
    }
  }

  return errors;
}

function lintManifestGenerationContext(projectDir: string, manifest: unknown): UsageLint[] {
  if (!isRecord(manifest)) return [];

  // code_roots.backend is optional — it's a hint for AI generation, not a hard requirement
  const generation = isRecord(manifest.generation) ? manifest.generation : {};
  const codeRoots = isRecord(generation.code_roots) ? generation.code_roots : null;
  const backendRoot = codeRoots && typeof codeRoots.backend === "string" ? codeRoots.backend.trim() : "";

  if (!backendRoot) return [];

  const resolvedBackendRoot = resolve(projectDir, backendRoot);
  if (!existsSync(resolvedBackendRoot)) {
    return [{
      path: "openuispec.yaml",
      severity: "warning",
      message: `generation.code_roots.backend points to a missing folder: ${backendRoot}`,
    }];
  }

  return [];
}

function printSemanticErrors(label: string, errors: UsageLint[]): number {
  if (errors.length === 0) return 0;
  const previewLimit = 10;

  const realErrors = errors.filter((e) => e.severity !== "warning");
  const warnings = errors.filter((e) => e.severity === "warning");

  if (realErrors.length > 0) {
    console.log(`  FAIL  ${label} (${realErrors.length} semantic error(s))`);
    for (const error of realErrors.slice(0, previewLimit)) {
      console.log(`        [${error.path}] ${error.message}`);
    }
    if (realErrors.length > previewLimit) {
      console.log(`        ... and ${realErrors.length - previewLimit} more`);
    }
  }

  for (const warning of warnings) {
    console.log(`  WARN  ${label}: ${warning.message}`);
  }

  return realErrors.length;
}

export function collectSemanticLint(projectDir: string, includes: Includes): UsageLint[] {
  const manifest = readManifest(projectDir) as UnknownRecord;
  const context = buildContext(projectDir, includes, manifest);
  const contractsDir = resolve(projectDir, includes.contracts);

  const allErrors: UsageLint[] = [
    ...lintLocaleCoverage(context),
    ...lintManifestGenerationContext(projectDir, context.manifest),
  ];

  const files = [
    join(projectDir, "openuispec.yaml"),
    ...listFiles(resolve(projectDir, includes.screens), ".yaml"),
    ...listFiles(resolve(projectDir, includes.flows), ".yaml"),
    ...listFiles(resolve(projectDir, includes.platform), ".yaml"),
    ...listFiles(resolve(projectDir, includes.contracts), ".yaml"),
  ];

  for (const filePath of files) {
    allErrors.push(
      ...lintFile(filePath, context, { validateTokens: !filePath.startsWith(contractsDir) })
    );
  }

  return allErrors;
}

export function runSemanticLint(projectDir: string, includes: Includes): number {
  const manifest = readManifest(projectDir) as UnknownRecord;
  const context = buildContext(projectDir, includes, manifest);
  let total = 0;
  const contractsDir = resolve(projectDir, includes.contracts);

  total += printSemanticErrors("locales", lintLocaleCoverage(context));
  total += printSemanticErrors("openuispec.yaml", lintManifestGenerationContext(projectDir, context.manifest));

  const files = [
    join(projectDir, "openuispec.yaml"),
    ...listFiles(resolve(projectDir, includes.screens), ".yaml"),
    ...listFiles(resolve(projectDir, includes.flows), ".yaml"),
    ...listFiles(resolve(projectDir, includes.platform), ".yaml"),
    ...listFiles(resolve(projectDir, includes.contracts), ".yaml"),
  ];

  for (const filePath of files) {
    total += printSemanticErrors(
      basename(filePath),
      lintFile(filePath, context, { validateTokens: !filePath.startsWith(contractsDir) })
    );
  }

  return total;
}
