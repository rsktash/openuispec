<!-- openuispec-rules-start -->
<!-- openuispec-rules-version: 0.1.22 -->
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
3. `examples/taskflow/` — complete working example with all file types
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
5. **Update the manifest** — fill in `data_model` and `api.endpoints` in `openuispec/openuispec.yaml`.

## Making UI changes
1. Read the relevant spec files before modifying any UI code.
2. If the change requires a spec update, modify the spec FIRST, then update code.
3. Never modify generated code without updating the spec.
4. When adding a new screen, create the corresponding spec file.
5. When removing a screen, remove the spec file and update flow references.

## After modifying spec files
1. Run `openuispec validate` to check specs against the schema.
2. **Update the generated code** for each affected platform to match the new spec.
3. Run `openuispec drift --snapshot --target <target>` to baseline the updated state.
4. Run `openuispec drift` to verify no untracked drift remains.

## CLI commands
- `openuispec init` — scaffold a new spec project
- `openuispec validate [group...]` — validate spec files against schemas
- `openuispec drift --target <t>` — check for spec drift
- `openuispec drift --snapshot --target <t>` — snapshot current state
- `openuispec update-rules` — update AI rules to match installed package version
- `openuispec drift --all` — include stubs in drift check
<!-- openuispec-rules-end -->
