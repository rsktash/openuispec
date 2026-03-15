<!-- openuispec-rules-start -->
<!-- openuispec-rules-version: 0.1.29 -->
# OpenUISpec — AI Assistant Rules
# ================================
# This project uses OpenUISpec to define UI as a semantic spec.
# Spec files are the single source of truth for all UI across platforms.
# Targets: "ios", "android", "web"

## IMPORTANT — Read the specification before working with spec files

The spec format, file schemas, and generation rules are defined in the installed `openuispec` package.
You MUST read the reference files listed below before creating, editing, or generating from any spec file.
Do NOT guess the file format — skipping this step will produce invalid YAML that fails validation.

**Find the package in this order:**
1. `node_modules/openuispec/` (project dependency)
2. Run `npm root -g` → `<prefix>/openuispec/` (global install)
3. Online: `https://openuispec.rsteam.uz/llms-full.txt` (if not installed)

**Reference files inside the package (read in this order):**
1. `README.md` — schema tables, file format reference, root wrapper keys
2. `spec/openuispec-v0.1.md` — full specification (contracts, layout, expressions, adaptive, etc.)
3. `examples/taskflow/openuispec/` — complete working example with all file types
4. `schema/` — JSON Schemas for every file type

These files are updated with each package version. Always read from the installed package,
not from cached or memorized content, to ensure you use the latest spec.

## What is OpenUISpec
OpenUISpec is a YAML-based spec format that describes an app's UI semantically — tokens, screens, flows, and platform overrides. AI reads the spec and generates native code (SwiftUI, Compose, React). AI reads native code and updates the spec. The spec is the sync layer between platforms.

## Spec location
- Spec root: `openuispec/`
- Manifest: `openuispec/openuispec.yaml` — always read this first.
- Tokens: `openuispec/tokens/`
- Screens: `openuispec/screens/`
- Flows: `openuispec/flows/`
- Contracts: `openuispec/contracts/`
- Platform: `openuispec/platform/`
- Locales: `openuispec/locales/`

**Note:** These are the default paths. Actual paths are in `includes:` in `openuispec.yaml` and may use relative paths. Always read `openuispec.yaml` to find the real directories.

## If spec directories are empty (first-time setup)
This means the project has existing UI code but hasn't been specced yet. Your job:

1. **Read the spec first** — find and read `spec/openuispec-v0.1.md` from the installed package.
2. **Find existing screens** — scan the codebase for UI screen files.
3. **Create stubs** — for each screen, create `openuispec/screens/<name>.yaml` with:
   ```yaml
   screen_name:
     semantic: "Brief description of what this screen does"
     status: stub
     layout:
       type: scroll_vertical
   ```
4. **Extract tokens** — scan for colors, fonts, spacing and create files in `openuispec/tokens/`.
5. **Update the manifest** — fill in `data_model`, `api.endpoints`, and `generation.code_roots.backend` in `openuispec/openuispec.yaml`.

## OpenUISpec Source Of Truth

OpenUISpec spec files are the primary source of truth for UI behavior across platforms.

### Start from spec when:
- the request changes screen structure
- the request changes navigation
- the request changes fields, actions, validation, or data binding
- the request changes tokens, variants, contracts, flows, or localization
- the request affects more than one platform
- the request is phrased in product/UI terms rather than platform-code terms

Spec-first workflow:
1. Read `openuispec/openuispec.yaml` and the relevant spec files first.
2. Update the spec first.
3. Update the affected generated/native UI code to match the spec.
4. Run `openuispec validate`.
5. Run `openuispec validate semantic`.
6. Run `openuispec drift --target <target> --explain` to inspect semantic changes since that target's baseline.
7. Run `openuispec prepare --target <target>` to build the target work bundle for that target. In `bootstrap` mode it provides first-generation constraints; in `update` mode it provides drift-based update scope.
   If the target stack was filled from defaults, stop and ask the user to confirm or change it before implementation.
8. Verify the affected UI targets build/run if possible.
9. Only then run `openuispec drift --snapshot --target <target>` for affected targets, after that target output directory exists.
10. Run `openuispec drift --target <target> --explain` again to confirm no spec changes remain for that target.
11. Use `openuispec status` to see which other targets are still behind the updated spec.

### Start from platform code when:
- the change is platform-specific polish
- the change is a local bug fix that does not alter shared semantic behavior
- the request explicitly asks for an iOS-only, Android-only, or web-only adjustment

Platform-first workflow:
1. Update native/platform code.
2. If the change affects shared semantics, sync the spec afterward.
3. If the change is intentionally platform-specific, document it in `platform/*.yaml` when appropriate.

### Never do this:
- Do not snapshot drift immediately after changing spec unless the UI code has also been updated.
- Do not treat `openuispec drift` as proof that generated UI matches the spec.
- Do not skip `--explain` / `prepare` when another platform needs to catch up with shared spec changes.
- Do not modify generated UI without checking whether the spec must change first.
- Do not use `configure-target --defaults` as silent approval for implementation. Ask the user to confirm the stack first.

## CLI commands
- `openuispec init` — scaffold a new spec project
- `openuispec validate [group...]` — validate spec files against schemas
- `openuispec validate semantic` — run semantic cross-reference linting
- `openuispec drift --target <t>` — check for spec drift
- `openuispec drift --target <t> --explain` — explain semantic spec drift since the target baseline
- `openuispec drift --snapshot --target <t>` — snapshot current state after the target output exists
- `openuispec prepare --target <t>` — build the target work bundle and check whether stack confirmation is still pending
- `openuispec status` — show cross-target baseline/drift status
- `openuispec update-rules` — update AI rules to match installed package version
- `openuispec drift --all` — include stubs in drift check
<!-- openuispec-rules-end -->
