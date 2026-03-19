<!-- openuispec-rules-start -->
<!-- openuispec-rules-version: 0.2.9 -->
# OpenUISpec — AI Assistant Rules
# ================================
# This project uses OpenUISpec to define UI as a semantic spec.
# Spec files are the single source of truth for all UI across platforms.
# Targets: "ios", "android", "web"

## MANDATORY — UI work requires OpenUISpec tools

When the user's request involves UI — screens, navigation, layout, tokens, flows, localization,
or any visual/structural change — you MUST use the OpenUISpec tools before writing any code.

### MCP Tools (use these when available)

Call these MCP tools directly. They return structured JSON with everything you need.

**Pre-generation:**
1. Call `openuispec_prepare` with the target platform — returns spec context, platform config, constraints.
2. Call `openuispec_read_specs` to load spec file contents. Use these as the AUTHORITATIVE source.
3. If spec changes are needed, update spec files FIRST, then call `openuispec_check`.
4. Generate or update the platform UI code based on the spec contents.

**Post-generation (EVERY TIME after writing UI code):**
5. Call `openuispec_check` to validate spec integrity.
6. Call `openuispec_read_specs` for the screens/contracts you just generated code for.
7. Audit your generated code against the spec. For each screen, verify:
   - Every field/action in the spec has a corresponding UI element
   - Token values (colors, spacing, radii) match exactly — no approximations
   - Contract `must_handle` states are all implemented (loading, error, empty, etc.)
   - `anti_patterns` from prepare output: confirm none of the listed patterns appear in generated code
   - `design_context.complexity_rule` is honored (motion, elevation, decorative detail level)
   - Adaptive breakpoints match the spec's `size_classes`
   - Locale keys match `$t:` references
   - Navigation targets match flow definitions
8. Report any real gaps found and fix them before finishing.

**Creating new spec files:**
- Call `openuispec_spec_types` to discover available spec types.
- Call `openuispec_spec_schema` with the specific type to get the full JSON schema.
- Write the spec file following the schema exactly.

**Focused getters (prefer these for incremental edits over `read_specs`):**
- `openuispec_get_screen(name)` — single screen spec
- `openuispec_get_contract(name, variant?)` — single contract, optionally one variant
- `openuispec_get_component(name, variant?)` — single component, optionally one variant
- `openuispec_get_tokens(category)` — single token category (color, typography, spacing, etc.)
- `openuispec_get_locale(locale, keys?)` — single locale file, optionally filtered keys
- `openuispec_check(target, screens?, contracts?)` — scoped audit for specific screens/contracts

Use `read_specs` for full-project generation; use focused getters when editing one screen or contract.

**Other tools:**
- `openuispec_status` — cross-target summary, good starting point
- `openuispec_drift` with `explain: true` — property-level spec changes
- `openuispec_validate` — schema-only validation by group

### CLI fallback (when MCP is not available)

If MCP tools are not available, use these CLI commands with `--json` flag:

**Status & discovery:**
- `openuispec status --json` — cross-target status
- `openuispec spec-types` — list available spec types
- `openuispec spec-schema <type>` — get JSON schema for a spec type

**Spec access:**
- `openuispec read-specs [paths...]` — read spec file contents
- `openuispec get-screen <name>` — get a single screen spec
- `openuispec get-contract <name> [--variant v]` — get a contract spec
- `openuispec get-component <name> [--variant v]` — get a component spec
- `openuispec get-tokens <category>` — get tokens for a category
- `openuispec get-locale <locale> [--keys k1,k2]` — get a locale file

**Validation & generation workflow:**
- `openuispec validate [group...] --json` — validate spec files against JSON Schemas
- `openuispec check --target <t> --json` — validate spec files + check target generation readiness
- `openuispec check --target <t> --audit` — also run design quality audit (score + anti-pattern checklist)
- `openuispec check --target <t> --audit --min-score 70` — fail if design quality score below threshold
- `openuispec prepare --target <t> --json` — build AI-ready work bundle
- `openuispec drift --target <t> --explain --json` — semantic drift

**Visual verification:**
- `openuispec screenshot --route /path` — screenshot the web app
- `openuispec screenshot --route /path --init-script "..."` — inject auth/role before rendering (web only; app must implement `__ous_init` bootstrapper)
- `openuispec screenshot-android [--project-dir path]` — screenshot Android app
- `openuispec screenshot-ios [--project-dir path]` — screenshot iOS app

### Other CLI commands
- `openuispec init` — scaffold a new spec project
- `openuispec configure-target <t>` — configure target platform stack
- `openuispec update-rules` — update AI rules to match installed package version
- `openuispec drift --snapshot --target <t>` — snapshot current state (only after UI code is updated)

## Spec format reference

The spec format, schemas, and generation rules are in the installed `openuispec` package.
You MUST read the reference files before creating or editing spec files — do NOT guess the format.

**Find the package:** `node_modules/openuispec/` or run `npm root -g` → `<prefix>/openuispec/`.
**Online fallback:** `https://openuispec.rsteam.uz/llms-full.txt`

**Reference files (read in order):**
1. `README.md` — schema tables, file format, root wrapper keys
2. `spec/openuispec-v0.2.md` — full specification
3. `examples/taskflow/openuispec/` — complete working example
4. `schema/` — JSON Schemas for every file type

## Spec location
- Spec root: `openuispec/` — read `openuispec/openuispec.yaml` first for actual paths.
- Default dirs: tokens/, screens/, flows/, contracts/, components/, platform/, locales/

## When to start from spec vs platform code

**Spec-first** (use `openuispec_prepare` or `openuispec prepare`):
- Screen structure, navigation, fields, actions, validation, data binding changes
- Token, variant, contract, flow, or localization changes
- Changes affecting multiple platforms
- Requests in product/UI terms

**Platform-first** (skip spec tools):
- Platform-specific polish (iOS-only, Android-only, web-only)
- Local bug fixes that don't alter shared semantic behavior

## If spec directories are empty (first-time setup)

Read `spec/openuispec-v0.2.md` from the package first, then:
1. Scan codebase for UI screens → create `openuispec/screens/<name>.yaml` as `status: stub`
2. Extract tokens (colors, fonts, spacing) → `openuispec/tokens/`
3. Create contract extensions → `openuispec/contracts/`
4. Create locale files → `openuispec/locales/<locale>.json`
5. Fill in `data_model`, `api.endpoints` in `openuispec/openuispec.yaml`

## Rules
- Do not snapshot drift unless the UI code has also been updated.
- Do not modify generated UI without checking whether the spec must change first.
- Do not use `configure-target --defaults` as silent approval — ask the user to confirm.
- Always read spec format from the installed package, not from cached/memorized content.
<!-- openuispec-rules-end -->
