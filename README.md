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

```
┌─────────────────────────┐
│   OpenUISpec (YAML)     │  ← Single source of truth
│   Tokens + Contracts    │
│   Screens + Flows       │
└────────┬────────────────┘
         │
    AI Generation Layer
         │
    ┌────┴─────┬──────────┐
    ▼          ▼          ▼
 SwiftUI   Compose     React
  (iOS)   (Android)    (Web)
```

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

1. Read the [spec](./spec/openuispec-v0.1.md)
2. Explore the [TaskFlow example app](./examples/taskflow/)
3. Hand the example to any AI code generator:

> Generate a native iOS app from this OpenUISpec. Follow all contract state machines, apply token ranges for iOS, and implement navigation flows as defined. Use `platform/ios.yaml` for SwiftUI-specific overrides.

## Repository structure

```
openuispec/
├── spec/
│   └── openuispec-v0.1.md              # Full specification (11 sections)
├── schema/                              # JSON Schema for validation (draft 2020-12)
│   ├── openuispec.schema.json          # Root manifest schema
│   ├── screen.schema.json              # Screen composition schema
│   ├── flow.schema.json                # Navigation flow schema
│   ├── platform.schema.json            # Platform adaptation schema
│   ├── locale.schema.json              # Locale file schema
│   ├── tokens/
│   │   ├── color.schema.json           # Color token schema
│   │   ├── typography.schema.json      # Typography token schema
│   │   ├── spacing.schema.json         # Spacing token schema
│   │   ├── elevation.schema.json       # Elevation token schema
│   │   ├── motion.schema.json          # Motion token schema
│   │   ├── layout.schema.json          # Layout token schema
│   │   └── themes.schema.json          # Theme token schema
│   ├── defs/
│   │   ├── common.schema.json          # Shared types (icons, badges, etc.)
│   │   ├── action.schema.json          # 13 action types (discriminated union)
│   │   ├── data-binding.schema.json    # Data sources, state, params
│   │   └── adaptive.schema.json        # Adaptive override pattern
│   └── validate.ts                     # Validation script (npm run validate)
├── examples/
│   └── taskflow/                        # Complete example app
│       ├── openuispec.yaml              # Root manifest + data model + API endpoints
│       ├── tokens/
│       │   ├── color.yaml               # Brand + semantic + status colors
│       │   ├── typography.yaml          # Font family + 8-step type scale
│       │   ├── spacing.yaml             # 4px base unit, 9-step scale
│       │   ├── elevation.yaml           # 4-level elevation (none/sm/md/lg)
│       │   ├── motion.yaml              # Durations, easings, patterns
│       │   ├── layout.yaml              # Size classes, primitives, reflow rules
│       │   └── themes.yaml              # Light, dark, warm variants
│       ├── contracts/                   # 7 contract family stubs (see spec Section 4)
│       ├── screens/
│       │   ├── home.yaml                # Task list with search, filters, FAB, adaptive nav
│       │   ├── task_detail.yaml         # Full task view with actions + assignee sheet
│       │   ├── projects.yaml            # Project grid + new project dialog
│       │   ├── project_detail.yaml      # Single project with task list (stub)
│       │   ├── settings.yaml            # Preferences, toggles, account management
│       │   ├── profile_edit.yaml        # Edit profile form (stub)
│       │   └── calendar.yaml            # Calendar view (stub)
│       ├── flows/
│       │   ├── create_task.yaml         # Task creation form (sheet presentation)
│       │   └── edit_task.yaml           # Task editing flow
│       ├── locales/
│       │   └── en.json                  # English locale (ICU MessageFormat)
│       └── platform/
│           ├── ios.yaml                 # SwiftUI overrides + behaviors
│           ├── android.yaml             # Compose overrides + behaviors
│           └── web.yaml                 # React overrides + responsive rules
├── LICENSE
└── README.md
```

## Spec at a glance

| Section | What it defines |
|---------|----------------|
| 1. Philosophy | Core principles: semantic, constrained, contract-driven, AI-first |
| 2. Document structure | Project layout and root manifest |
| 3. Token layer | Color, typography, spacing, elevation, motion, layout, themes |
| 4. Component contracts | 7 behavioral families (action_trigger, data_display, input_field, nav_container, feedback, surface, collection) |
| 5. Screen composition | Contract-based layouts, screen-level keys, adaptive layout system |
| 6. Navigation flows | Multi-screen journeys with transitions and progress |
| 7. Platform adaptation | Per-target overrides for iOS, Android, Web |
| 8. AI generation contract | Compliance levels (MUST/SHOULD/MAY), validation, drift detection |
| 9. Action system | 13 action types, composition, optimistic updates |
| 10. Data binding & state | Sources, paths, format expressions, reactivity, caching |
| 11. Internationalization | Locale files, `$t:` references, ICU MessageFormat, RTL, platform mapping |

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

**v0.1 — Draft**. The spec covers all foundational layers. One complete example app (TaskFlow) demonstrates full coverage.

### Roadmap

- [x] Token system with constrained ranges
- [x] 7 component contract families
- [x] Adaptive layout system (size classes + reflow rules)
- [x] Action system (13 types, composition, optimistic updates)
- [x] Data binding & state management (sources, expressions, caching)
- [x] Format expression grammar with computed expressions
- [x] Internationalization (i18n) with ICU MessageFormat and `$t:` references
- [x] JSON Schema for spec validation
- [ ] Custom contract extension mechanism
- [ ] Icon system definition
- [ ] Form system (validation rules, field dependencies)
- [ ] Reference AI generator (spec → SwiftUI proof of concept)
- [ ] More example apps (e-commerce, social, dashboard)

## Contributing

OpenUISpec is in early development. If you're interested in contributing — especially around AI code generation, platform-specific expertise, or additional example apps — open an issue to start the conversation.

## License

MIT
