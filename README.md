# OpenUISpec

> A single source of truth design language for AI-native, platform-native app development.

OpenUISpec is a **semantic UI specification format** that replaces cross-platform frameworks with a declarative design language. Instead of sharing runtime code across platforms, you share the *spec* — and AI generates native SwiftUI, Jetpack Compose, and React code from it.

## Why

Cross-platform frameworks (Flutter, React Native, KMP/CMP) solve code duplication by sharing a runtime. OpenUISpec solves it by sharing **intent**:

| Approach | Shares | Runs |
|----------|--------|------|
| Cross-platform framework | Runtime code | Abstraction layer |
| **OpenUISpec** | **Semantic spec** | **Native per platform** |

The result: each platform feels native, but every app stays consistent because it's generated from the same source of truth.

## How it works

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/rsktash/openuispec/main/docs/images/how-it-works-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/rsktash/openuispec/main/docs/images/how-it-works-light.png">
  <img alt="How OpenUISpec works" src="https://raw.githubusercontent.com/rsktash/openuispec/main/docs/images/how-it-works-light.png">
</picture>

## Workflows

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/rsktash/openuispec/main/docs/images/workflows-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/rsktash/openuispec/main/docs/images/workflows-light.png">
  <img alt="OpenUISpec workflows" src="https://raw.githubusercontent.com/rsktash/openuispec/main/docs/images/workflows-light.png">
</picture>

## Key concepts

- **Tokens**: Design values (color, typography, spacing, elevation, motion) with semantic names and constrained ranges
- **Contracts**: 7 behavioral component families defined by role, props, state machines, and accessibility
- **Screens**: Compositions of contracts with data bindings, adaptive layout, and conditional rendering
- **Flows**: Multi-screen navigation journeys, intent-based and platform-agnostic
- **Actions**: 13 typed action types with composition, error handling, and optimistic updates
- **Data binding**: Reactive state, format expressions, caching, and loading/error/empty states
- **Adaptive layout**: Size classes (compact/regular/expanded) with per-section overrides
- **Platform adaptation**: Per-target overrides for iOS, Android, and Web behaviors

## Quick start

```bash
npm install -g openuispec
cd your-project
openuispec init
```

This scaffolds a spec directory, starter tokens, and adds rules to `CLAUDE.md` / `AGENTS.md` so AI assistants track spec changes automatically.

Then hand your spec to any AI code generator:

> Generate a native iOS app from this OpenUISpec. Follow all contract state machines, apply token ranges for iOS, and implement navigation flows as defined. Use `platform/ios.yaml` for SwiftUI-specific overrides.

See the examples for concrete reference projects:

- [TaskFlow](./examples/taskflow/) for a compact spec covering all 7 contract families
- [Todo Orbit](./examples/todo-orbit/openuispec/) for a bilingual task app with generated iOS, Android, and web targets under `examples/todo-orbit/generated/`

## Repository structure

```
openuispec/
├── spec/
│   └── openuispec-v0.1.md              # Full specification (14 sections)
├── schema/                              # JSON Schema for validation (draft 2020-12)
│   ├── openuispec.schema.json          # Root manifest schema
│   ├── screen.schema.json              # Screen composition schema
│   ├── flow.schema.json                # Navigation flow schema
│   ├── platform.schema.json            # Platform adaptation schema
│   ├── locale.schema.json              # Locale file schema
│   ├── contract.schema.json            # Standard contract extension schema
│   ├── custom-contract.schema.json    # Custom contract extension schema (x_ prefixed)
│   ├── tokens/
│   │   ├── color.schema.json           # Color token schema
│   │   ├── typography.schema.json      # Typography token schema
│   │   ├── spacing.schema.json         # Spacing token schema
│   │   ├── elevation.schema.json       # Elevation token schema
│   │   ├── motion.schema.json          # Motion token schema
│   │   ├── layout.schema.json          # Layout token schema
│   │   ├── themes.schema.json          # Theme token schema
│   │   └── icons.schema.json          # Icon token schema
│   ├── defs/
│   │   ├── common.schema.json          # Shared types (icons, badges, etc.)
│   │   ├── action.schema.json          # 13 action types (discriminated union)
│   │   ├── data-binding.schema.json    # Data sources, state, params
│   │   ├── adaptive.schema.json        # Adaptive override pattern
│   │   └── validation.schema.json     # Validation rule definitions
│   └── validate.ts                     # Validation script (npm run validate)
├── examples/
│   ├── taskflow/                        # Compact reference spec
│   │   ├── openuispec.yaml              # Root manifest + data model + API endpoints
│   │   ├── tokens/
│   │   │   ├── color.yaml               # Brand + semantic + status colors
│   │   │   ├── typography.yaml          # Font family + 8-step type scale
│   │   │   ├── spacing.yaml             # 4px base unit, 9-step scale
│   │   │   ├── elevation.yaml           # 4-level elevation (none/sm/md/lg)
│   │   │   ├── motion.yaml              # Durations, easings, patterns
│   │   │   ├── layout.yaml              # Size classes, primitives, reflow rules
│   │   │   ├── themes.yaml              # Light, dark, warm variants
│   │   │   └── icons.yaml               # Icon registry with platform mappings
│   │   ├── contracts/                   # Standard contract extensions + custom contracts
│   │   │   ├── input_field.yaml         # Standard contract with cut_corner variant
│   │   │   └── x_media_player.yaml      # Custom media player contract (Section 12)
│   │   ├── screens/
│   │   │   ├── home.yaml                # Task list with search, filters, FAB, adaptive nav
│   │   │   ├── task_detail.yaml         # Full task view with actions + assignee sheet
│   │   │   ├── projects.yaml            # Project grid + new project dialog
│   │   │   ├── project_detail.yaml      # Single project with task list (stub)
│   │   │   ├── settings.yaml            # Preferences, toggles, account management
│   │   │   ├── profile_edit.yaml        # Edit profile form (stub)
│   │   │   └── calendar.yaml            # Calendar view (stub)
│   │   ├── flows/
│   │   │   ├── create_task.yaml         # Task creation form (sheet presentation)
│   │   │   └── edit_task.yaml           # Task editing flow
│   │   ├── locales/
│   │   │   └── en.json                  # English locale (ICU MessageFormat)
│   │   └── platform/
│   │       ├── ios.yaml                 # SwiftUI overrides + behaviors
│   │       ├── android.yaml             # Compose overrides + behaviors
│   │       └── web.yaml                 # React overrides + responsive rules
│   └── todo-orbit/                      # Full showcase app with generated targets
│       ├── openuispec/                  # Source OpenUISpec project
│       ├── generated/                   # Generated iOS, Android, and web apps
│       └── artifacts/                   # Screenshots and supporting outputs
├── cli/                                 # CLI tool (openuispec init, drift, validate)
│   ├── index.ts                        # Entry point
│   └── init.ts                         # Project scaffolding + AI rules
├── drift/                               # Drift detection (spec change tracking)
│   └── index.ts                        # Hash-based drift checker
├── LICENSE
└── README.md
```

## File formats and schemas

Every file type has a corresponding JSON Schema in `schema/`. **Read the schema before creating or editing a file** — do not guess the structure.

| File | Schema | Root key | Example |
|------|--------|----------|---------|
| `openuispec.yaml` | `openuispec.schema.json` | `spec_version` | [openuispec.yaml](./examples/taskflow/openuispec.yaml) |
| `screens/*.yaml` | `screen.schema.json` | `<screen_id>` | [home.yaml](./examples/taskflow/screens/home.yaml) |
| `flows/*.yaml` | `flow.schema.json` | `<flow_id>` | [create_task.yaml](./examples/taskflow/flows/create_task.yaml) |
| `platform/*.yaml` | `platform.schema.json` | `platform` | [ios.yaml](./examples/taskflow/platform/ios.yaml) |
| `locales/*.json` | `locale.schema.json` | (object) | [en.json](./examples/taskflow/locales/en.json) |
| `contracts/<name>.yaml` | `contract.schema.json` | `<contract_name>` | [input_field.yaml](./examples/taskflow/contracts/input_field.yaml) |
| `contracts/x_*.yaml` | `custom-contract.schema.json` | `<x_name>` | [x_media_player.yaml](./examples/taskflow/contracts/x_media_player.yaml) |
| `tokens/color.yaml` | `tokens/color.schema.json` | `color` | [color.yaml](./examples/taskflow/tokens/color.yaml) |
| `tokens/typography.yaml` | `tokens/typography.schema.json` | `typography` | [typography.yaml](./examples/taskflow/tokens/typography.yaml) |
| `tokens/spacing.yaml` | `tokens/spacing.schema.json` | `spacing` | [spacing.yaml](./examples/taskflow/tokens/spacing.yaml) |
| `tokens/elevation.yaml` | `tokens/elevation.schema.json` | `elevation` | [elevation.yaml](./examples/taskflow/tokens/elevation.yaml) |
| `tokens/motion.yaml` | `tokens/motion.schema.json` | `motion` | [motion.yaml](./examples/taskflow/tokens/motion.yaml) |
| `tokens/layout.yaml` | `tokens/layout.schema.json` | `layout` | [layout.yaml](./examples/taskflow/tokens/layout.yaml) |
| `tokens/themes.yaml` | `tokens/themes.schema.json` | `themes` | [themes.yaml](./examples/taskflow/tokens/themes.yaml) |
| `tokens/icons.yaml` | `tokens/icons.schema.json` | `icons` | [icons.yaml](./examples/taskflow/tokens/icons.yaml) |

Every token file **must** have a single root wrapper key matching its type:

```yaml
# Correct — tokens/color.yaml
color:
  brand:
    primary: ...

# Wrong — missing root key
brand:
  primary: ...
```

Validate with: `openuispec validate`

## Output directories

By default, drift stores state in `generated/<target>/<project>/`. To point targets to your actual code directories, add `output_dir` to `openuispec.yaml`:

```yaml
generation:
  targets: [ios, android, web]
  output_dir:
    web: "../web-ui/"
    android: "../kmp-ui/"
    ios: "../kmp-ui/iosApp/"
```

Paths are relative to `openuispec.yaml`. The `.openuispec-state.json` file is stored inside each output directory.

## Spec at a glance

| Section | What it defines |
|---------|----------------|
| 1. Philosophy | Core principles: semantic, constrained, contract-driven, AI-first |
| 2. Document structure | Project layout and root manifest |
| 3. Token layer | Color, typography, spacing, elevation, motion, layout, themes, icons |
| 4. Component contracts | 7 behavioral families (action_trigger, data_display, input_field, nav_container, feedback, surface, collection) |
| 5. Screen composition | Contract-based layouts, screen-level keys, adaptive layout system |
| 6. Navigation flows | Multi-screen journeys with transitions and progress |
| 7. Platform adaptation | Per-target overrides for iOS, Android, Web |
| 8. AI generation contract | Compliance levels (MUST/SHOULD/MAY), validation, drift detection |
| 9. Action system | 13 action types, composition, optimistic updates |
| 10. Data binding & state | Sources, paths, format expressions, reactivity, caching |
| 11. Internationalization | Locale files, `$t:` references, ICU MessageFormat, RTL, platform mapping |
| 12. Custom contract extensions | `x_` prefixed domain-specific contracts, registration, dependencies |
| 13. Form validation & field dependencies | Validation rules, field dependencies, cross-field checks, async validation |
| 14. Development workflow | Dual-workflow model, drift detection, spec as sync layer |

## The 7 contract families

| Contract | Role | Maps to |
|----------|------|---------|
| `action_trigger` | Initiates actions | Button, FAB, link |
| `data_display` | Shows read-only info | Card, list item, stat |
| `input_field` | Captures user input | TextField, toggle, picker |
| `nav_container` | Persistent navigation | Tab bar, sidebar, drawer |
| `feedback` | System status messages | Toast, dialog, banner |
| `surface` | Contains other components | Sheet, modal, popover |
| `collection` | Repeating data sets | List, grid, table |

## Status

**v0.1 — Draft**. The spec covers all foundational layers. TaskFlow provides a compact reference app, and Todo Orbit extends coverage with localization, recurring-rule flows, custom contracts, and generated native/web targets.

### Roadmap

- [x] Token system with constrained ranges
- [x] 7 component contract families
- [x] Adaptive layout system (size classes + reflow rules)
- [x] Action system (13 types, composition, optimistic updates)
- [x] Data binding & state management (sources, expressions, caching)
- [x] Format expression grammar with computed expressions
- [x] Internationalization (i18n) with ICU MessageFormat and `$t:` references
- [x] JSON Schema for spec validation
- [x] Custom contract extension mechanism
- [x] Icon system definition
- [x] Form system (validation rules, field dependencies)
- [x] Drift detection (spec change tracking per platform)
- [x] CLI tool (`openuispec init` for project scaffolding + AI rules)
- [x] Multi-platform showcase app (`examples/todo-orbit/`)
- [ ] More example apps (e-commerce, social, dashboard)

## Contributing

OpenUISpec is in early development. If you're interested in contributing — especially around AI code generation, platform-specific expertise, or additional example apps — open an issue to start the conversation.

## License

MIT
