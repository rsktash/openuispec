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

- **Tokens**: Design values (color, typography, spacing) with semantic names and constrained ranges — not exact pixels, not pure abstraction
- **Contracts**: Behavioral component families (`action_trigger`, `data_display`, `input_field`, etc.) defined by role, props, state machines, and accessibility — not by widget names
- **Screens**: Compositions of contracts with data bindings and layout rules
- **Flows**: Multi-screen navigation journeys, intent-based and platform-agnostic
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
│   └── openuispec-v0.1.md          # Full specification document
├── examples/
│   └── taskflow/                    # Complete example app
│       ├── openuispec.yaml          # Root manifest + data model
│       ├── tokens/                  # Color, typography, spacing, motion, themes
│       ├── screens/                 # Home, task detail, projects, settings
│       ├── flows/                   # Create task flow
│       └── platform/               # iOS, Android, Web adaptations
├── LICENSE
└── README.md
```

## Spec at a glance

| Layer | What it defines | Format |
|-------|----------------|--------|
| Tokens | Colors, type, spacing, motion, themes | Semantic names + value ranges |
| Contracts | 7 behavioral families covering ~95% of UI | Props, state machines, a11y, platform mapping |
| Screens | Contract compositions with layout + data binding | Declarative YAML |
| Flows | Multi-screen navigation with transitions | Intent-based, no platform graph |
| Platform | Per-target overrides and behaviors | iOS / Android / Web YAML files |

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

**v0.1 — Draft**. The spec covers tokens, all 7 contract families, screen composition, navigation flows, platform adaptation, and AI generation contracts. One complete example app (TaskFlow) demonstrates full coverage.

### Roadmap

- [ ] JSON Schema for spec validation
- [ ] Formal grammar for format expressions (`{value | format:name}`)
- [ ] Custom contract extension mechanism
- [ ] Icon system definition
- [ ] Reference AI generator (spec → SwiftUI proof of concept)
- [ ] More example apps (e-commerce, social, dashboard)

## Contributing

OpenUISpec is in early development. If you're interested in contributing — especially around AI code generation, platform-specific expertise, or additional example apps — open an issue to start the conversation.

## License

MIT
