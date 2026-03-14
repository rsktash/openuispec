# OpenUISpec — AI Assistant Rules
# ================================
# This project uses OpenUISpec to define UI as a semantic spec.
# Spec files are the single source of truth for all UI across platforms.
# Targets: "ios", "android", "web"

## What is OpenUISpec
OpenUISpec is a YAML-based spec format that describes an app's UI semantically — tokens, screens, flows, and platform overrides. AI reads the spec and generates native code (SwiftUI, Compose, React). AI reads native code and updates the spec. The spec is the sync layer between platforms.

## Spec location
- Spec root: `openuispec/`
- Manifest: `openuispec/openuispec.yaml` — always read this first.
- Tokens: `openuispec/tokens/` — colors, typography, spacing, motion, icons, themes
- Screens: `openuispec/screens/` — one YAML file per screen
- Flows: `openuispec/flows/` — multi-step navigation journeys
- Contracts: `openuispec/contracts/` — UI component definitions
- Platform: `openuispec/platform/` — per-target overrides (iOS, Android, Web)
- Locales: `openuispec/locales/` — i18n strings (JSON, ICU MessageFormat)

**Note:** These are the default paths. Actual paths are in `includes:` in `openuispec.yaml` and may use relative paths (e.g. `../../shared/locales`). Always read `openuispec.yaml` to find the real directories.

## If spec directories are empty (first-time setup)
This means the project has existing UI code but hasn't been specced yet. Your job:

1. **Find existing screens** — scan the codebase for UI screen files (SwiftUI views, Compose screens, React components/pages).
2. **Create stubs** — for each screen, create `openuispec/screens/<name>.yaml` with:
   ```yaml
   screen_name:
     semantic: "Brief description of what this screen does"
     status: stub
     layout:
       type: scroll_vertical
   ```
3. **Extract tokens** — scan the codebase for colors, fonts, spacing values and create token files in `openuispec/tokens/`.
4. **Update the manifest** — fill in `data_model` and `api.endpoints` in `openuispec/openuispec.yaml` based on the existing code.
5. **Spec screens on demand** — when the user asks to spec a screen, read the native code, create a full spec, and change `status: draft` → `ready`.

## Screen and flow status
- `stub` — placeholder, not yet specced. Drift detection skips these.
- `draft` — actively being specced. Tracked by drift.
- `ready` — fully specified (default if omitted). Tracked by drift.

## Making UI changes
1. Read the relevant spec files before modifying any UI code.
2. If the change requires a spec update, modify the spec FIRST, then update code.
3. Never modify generated code without updating the spec.
4. When adding a new screen, create the corresponding spec file.
5. When removing a screen, remove the spec file and update flow references.

## After modifying spec files
1. Run `openuispec validate` to check specs against the schema.
2. Run `openuispec drift --snapshot --target <target>` for each affected platform.
3. Run `openuispec drift` to verify no untracked drift remains.

## Learning OpenUISpec — where to find the docs
All documentation is in the installed `openuispec` package. Search in this order:
1. **Local:** `node_modules/openuispec/` (project dependency)
2. **Global:** run `npm root -g` to get the global prefix, then look in `<prefix>/openuispec/`
3. **Online fallback:** if not installed, fetch from:
   - `https://openuispec.rsteam.uz/llms-full.txt` — complete spec + all JSON schemas
   - `https://openuispec.rsteam.uz/llms.txt` — concise summary with links

Inside the package:
1. **Full specification:** `spec/openuispec-v0.1.md` — the complete spec (read this to understand the format)
2. **Example app:** `examples/taskflow/` — a complete working app with all file types
3. **JSON Schemas:** `schema/` — validation schemas that define the exact structure of every file type

## Token file structure — root wrapper key required
Every token file must have a single root key matching the token type. Do NOT put properties at the top level.
- `tokens/color.yaml` → root key: `color`
- `tokens/typography.yaml` → root key: `typography`
- `tokens/spacing.yaml` → root key: `spacing`
- `tokens/elevation.yaml` → root key: `elevation`
- `tokens/motion.yaml` → root key: `motion`
- `tokens/layout.yaml` → root key: `layout`
- `tokens/themes.yaml` → root key: `themes`
- `tokens/icons.yaml` → root key: `icons`

## File formats and schemas — read before creating spec files
Before creating or editing any spec file, read the corresponding JSON Schema. Do not guess the file format.

| File | Schema (in `schema/` inside the installed package) | Root key |
|------|--------|----------|
| `openuispec.yaml` | `openuispec.schema.json` | `spec_version` |
| `screens/*.yaml` | `screen.schema.json` | `<screen_id>` |
| `flows/*.yaml` | `flow.schema.json` | `<flow_id>` |
| `platform/*.yaml` | `platform.schema.json` | `platform` |
| `locales/*.json` | `locale.schema.json` | (object) |
| `contracts/x_*.yaml` | `custom-contract.schema.json` | `contract` |
| `tokens/color.yaml` | `tokens/color.schema.json` | `color` |
| `tokens/typography.yaml` | `tokens/typography.schema.json` | `typography` |
| `tokens/spacing.yaml` | `tokens/spacing.schema.json` | `spacing` |
| `tokens/elevation.yaml` | `tokens/elevation.schema.json` | `elevation` |
| `tokens/motion.yaml` | `tokens/motion.schema.json` | `motion` |
| `tokens/layout.yaml` | `tokens/layout.schema.json` | `layout` |
| `tokens/themes.yaml` | `tokens/themes.schema.json` | `themes` |
| `tokens/icons.yaml` | `tokens/icons.schema.json` | `icons` |

Shared type definitions (actions, data-binding, adaptive, validation, common) are in `schema/defs/`.

Workflow: read the schema → read an example from `examples/taskflow/` → create the YAML → run `openuispec validate`.

## Spec format reference
- 7 contract families: nav_container, surface, action_trigger, input_field, data_display, collection, feedback
- Custom contracts: prefixed with `x_` (e.g., `x_media_player`)
- Data binding: `$data:`, `$state:`, `$param:`, `$t:` prefixes
- Actions: typed objects (navigate, api_call, set_state, confirm, sequence, feedback, etc.)
- Adaptive layout: size classes (compact, regular, expanded) with per-section overrides

## Output directories
Drift tracks spec changes per target. By default state is stored in `generated/<target>/<project>/`.
To map targets to actual code directories, set `generation.output_dir` in `openuispec.yaml`:
```yaml
generation:
  output_dir:
    web: "../web-ui/"
    android: "../kmp-ui/"
    ios: "../kmp-ui/iosApp/"
```
Paths are relative to `openuispec.yaml`. The `.openuispec-state.json` file is stored inside each output directory.

## CLI commands
- `openuispec init` — scaffold a new spec project
- `openuispec validate [group...]` — validate spec files against schemas
- `openuispec drift --target <t>` — check for spec drift
- `openuispec drift --snapshot --target <t>` — snapshot current state
- `openuispec drift --all` — include stubs in drift check
