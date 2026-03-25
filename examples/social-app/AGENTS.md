<!-- openuispec-rules-start -->
<!-- openuispec-rules-version: 0.2.21 -->
# OpenUISpec Rules

STOP — before writing ANY UI code you MUST call an OpenUISpec tool first.
No exceptions. Spec files are the single source of truth. Targets: "ios", "android", "web"

## Workflow

**Full generation** (new screens, multi-platform changes, first-time setup):
1. `openuispec_prepare(target, include_specs: true)` — returns everything
2. Generate code strictly from the spec contents returned
3. `openuispec_check(target, audit: true)` — returns a checklist, verify your code against it
4. Fix gaps. Repeat 2–3 until audit passes.

**Incremental edits** (one screen, one token, one locale key):
1. Use a focused getter: `get_screen`, `get_contract`, `get_component`, `get_tokens`, `get_locale`
2. Edit code based on the spec returned
3. `openuispec_check(target)` — validate

**Creating new spec files:**
1. `openuispec_spec_types` → `openuispec_spec_schema(type)` → write YAML following the schema

**Other tools:**
- `openuispec_status` — cross-target summary
- `openuispec_drift(explain: true)` — what changed since last baseline
- `openuispec_validate` — schema-only validation
- `openuispec_screenshot` / `screenshot_android` / `screenshot_ios` — visual verification
- `openuispec_preview(screen)` — render spec as HTML, no running app needed

**CLI fallback** (when MCP is unavailable): `openuispec <command> --json` — same names, with dashes.

## Spec-first vs platform-first

**Spec-first** (use the workflow above):
- Screen structure, navigation, fields, actions, validation, data binding
- Token, variant, contract, flow, or localization changes
- Changes affecting multiple platforms

**Platform-first** (skip spec tools):
- Platform-only polish (iOS-only animation, web-only CSS tweak)
- Bug fixes that don't alter shared behavior

## Spec format reference

Read from the installed package, NEVER guess the format:
- `node_modules/openuispec/README.md` — schema tables, file format
- `node_modules/openuispec/spec/openuispec-v0.2.md` — full specification
- `node_modules/openuispec/schema/` — JSON Schemas
- Online fallback: `https://openuispec.rsteam.uz/llms-full.txt`

## Spec location
- Spec root: `openuispec/` — read `openuispec/openuispec.yaml` first.
- Default dirs: tokens/, screens/, flows/, contracts/, components/, platform/, locales/

## If spec directories are empty
Read `spec/openuispec-v0.2.md` from the package, then create stubs:
screens → `openuispec/screens/`, tokens → `openuispec/tokens/`,
contracts → `openuispec/contracts/`, locales → `openuispec/locales/`

## Rules
- NEVER write UI code without calling an OpenUISpec tool first.
- NEVER snapshot drift without user approval.
- NEVER modify generated UI without checking whether the spec must change first.
- ALWAYS read spec format from the installed package, not from memory.
- After generation, remind the user: `openuispec drift --snapshot --target <t>`
<!-- openuispec-rules-end -->
