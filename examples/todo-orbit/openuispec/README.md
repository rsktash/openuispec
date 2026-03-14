# Todo Orbit — OpenUISpec

This directory contains the **OpenUISpec** semantic UI specification for **Todo Orbit**.

OpenUISpec is a YAML-based format that describes your app's UI semantically — tokens, screens, flows, and platform overrides. AI reads the spec and generates native code (SwiftUI, Compose, React). The spec is the single source of truth across all platforms.

Todo Orbit is a bilingual productivity sample that exercises task management, analytics, settings, and recurring-rule workflows across iOS, Android, and web targets.

## Directory structure

| Directory | Contents |
|-----------|----------|
| `tokens/` | Design tokens — colors, typography, spacing, elevation, motion, icons, themes |
| `screens/` | Screen definitions — one YAML file per screen |
| `flows/` | Navigation flows — multi-step user journeys |
| `contracts/` | Component contracts — standard extensions (variants, tokens) and custom (`x_` prefixed) |
| `platform/` | Platform overrides — per-target (iOS, Android, Web) behaviors |
| `locales/` | Localization — i18n strings (JSON, ICU MessageFormat) |

All directory paths are configured in `openuispec.yaml` under `includes:` and support relative paths. For example, to share locales across projects:
```yaml
includes:
  locales: "../../shared/locales"   # resolved relative to openuispec.yaml
```

## Getting started

**Start here:** read `openuispec.yaml` — it's the root manifest that defines the project structure, data model, API endpoints, and generation targets.

### New project (no existing UI code)

1. Define your data model and API endpoints in `openuispec.yaml`
2. Create token files in `tokens/` (colors, typography, spacing)
3. Create screen specs in `screens/` (one YAML per screen)
4. Create navigation flows in `flows/`
5. Ask AI to generate native code from the spec

### Existing project (adopting OpenUISpec)

1. Scan the codebase for existing UI screens
2. Create a stub for each screen in `screens/`:
   ```yaml
   screen_name:
     semantic: "Brief description of what this screen does"
     status: stub
     layout:
       type: scroll_vertical
   ```
3. Extract design tokens (colors, fonts, spacing) into `tokens/`
4. Fill in `data_model` and `api.endpoints` in `openuispec.yaml`
5. Spec screens incrementally: `stub` → `draft` → `ready`

## Screen and flow status

- `stub` — placeholder, not yet specced. Drift detection skips these.
- `draft` — actively being specced. Tracked by drift.
- `ready` — fully specified (default if omitted). Tracked by drift.

## Learning OpenUISpec — where to find the docs

All documentation is included in the installed `openuispec` package. Search for it in this order:
1. **Local:** `node_modules/openuispec/` (if installed as a project dependency)
2. **Global:** run `npm root -g` to find the global prefix, then look in `<prefix>/openuispec/`
3. **Online fallback:** if the package is not installed at all, fetch from:
   - `https://openuispec.rsteam.uz/llms-full.txt` — complete spec + all JSON schemas in one file
   - `https://openuispec.rsteam.uz/llms.txt` — concise summary with links

Inside the package:
- **Full specification:** `spec/openuispec-v0.1.md`
- **Example app:** `examples/taskflow/`
- **JSON Schemas:** `schema/`

## Token file structure — root wrapper key required

Every token file must have a single root key matching the token type. Do NOT put properties at the top level.

```yaml
# ✅ Correct — tokens/typography.yaml
typography:
  font_family: ...
  scale: ...

# ❌ Wrong — missing root wrapper key
font_family: ...
scale: ...
```

Root keys: `color`, `typography`, `spacing`, `elevation`, `motion`, `layout`, `themes`, `icons`.

## File formats and schemas

**IMPORTANT:** Before creating or editing any spec file, read the corresponding JSON Schema to understand the valid structure. Do not guess the file format.

| File | Schema | Root key |
|------|--------|----------|
| `openuispec.yaml` | `openuispec.schema.json` | `spec_version` |
| `screens/*.yaml` | `screen.schema.json` | `<screen_id>` |
| `flows/*.yaml` | `flow.schema.json` | `<flow_id>` |
| `platform/*.yaml` | `platform.schema.json` | `platform` |
| `locales/*.json` | `locale.schema.json` | (object) |
| `contracts/<name>.yaml` | `contract.schema.json` | `<contract_name>` |
| `contracts/x_*.yaml` | `custom-contract.schema.json` | `<x_name>` |
| `tokens/color.yaml` | `tokens/color.schema.json` | `color` |
| `tokens/typography.yaml` | `tokens/typography.schema.json` | `typography` |
| `tokens/spacing.yaml` | `tokens/spacing.schema.json` | `spacing` |
| `tokens/elevation.yaml` | `tokens/elevation.schema.json` | `elevation` |
| `tokens/motion.yaml` | `tokens/motion.schema.json` | `motion` |
| `tokens/layout.yaml` | `tokens/layout.schema.json` | `layout` |
| `tokens/themes.yaml` | `tokens/themes.schema.json` | `themes` |
| `tokens/icons.yaml` | `tokens/icons.schema.json` | `icons` |

All schemas are in `schema/` inside the installed package. Shared type definitions (actions, data-binding, adaptive, validation, common) are in `schema/defs/`.

**Workflow:** read the schema → read an example from `examples/taskflow/` → create the YAML → run `openuispec validate`.

## Spec format quick reference

- **7 contract families:** nav_container, surface, action_trigger, input_field, data_display, collection, feedback
- **Custom contracts:** prefixed with `x_` (e.g., `x_media_player`)
- **Data binding:** `$data:`, `$state:`, `$param:`, `$t:` prefixes
- **Actions:** typed objects — navigate, api_call, set_state, confirm, sequence, feedback, etc.
- **Adaptive layout:** size classes (compact, regular, expanded) with per-section overrides

## CLI commands

```bash
openuispec validate             # Validate spec files against schemas
openuispec validate screens     # Validate only screens
openuispec drift --target ios    # Check for spec drift
openuispec drift --snapshot --target ios  # Snapshot current state
openuispec drift --all          # Include stubs in drift check
```

## Targets and output directories

This project generates native code for: **ios, android, web**

By default, drift stores state in `generated/<target>/<project>/`. To point targets to your actual code directories, add `output_dir` to `openuispec.yaml`:

```yaml
generation:
  targets: [ios, android, web]
  output_dir:
    web: "../web-ui/"
    android: "../kmp-ui/"
    ios: "../kmp-ui/iosApp/"
```

Paths are relative to `openuispec.yaml`.

## Learn more

All docs and examples are in the installed `openuispec` package — check `node_modules/openuispec/` or run `npm root -g` for the global install path.

- Full spec: `spec/openuispec-v0.1.md`
- Example app: `examples/taskflow/`
- JSON Schemas: `schema/`
- Online reference: `https://openuispec.rsteam.uz/llms-full.txt`
