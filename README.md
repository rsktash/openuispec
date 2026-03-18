# OpenUISpec

> A single source of truth design language for AI-native, platform-native app development.

OpenUISpec is a **semantic UI specification format** that replaces cross-platform frameworks with a declarative design language.
Instead of sharing runtime code across platforms, you share the *spec* — and AI generates native SwiftUI, Jetpack Compose, and React code from it.

## Why

Cross-platform frameworks (Flutter, React Native, KMP/CMP) solve code duplication by sharing a runtime.
OpenUISpec solves it by sharing **intent**:

| Approach | Shares | Runs |
|----------|--------|------|
| Cross-platform framework | Runtime code | Abstraction layer |
| **OpenUISpec** | **Semantic spec** | **Native per platform** |

The result: each platform feels native, but every app stays semantically consistent because it's generated from the same source of truth.

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

## Quick start

```bash
npm install -g openuispec
cd your-project
openuispec init
```

This scaffolds a spec directory, starter tokens, and **configures the MCP server** for your AI coding agent (Claude Code, VS Code/Copilot, Codex, Gemini CLI).

## Key concepts

- **Tokens** — design values (color, typography, spacing, elevation, motion) with semantic names and constrained ranges
- **Contracts** — 7 reusable UI component families defined by role, props, interaction states, and accessibility
- **Screens** — compositions of contracts with data bindings, adaptive layout, and conditional rendering
- **Flows** — multi-screen navigation journeys, intent-based and platform-agnostic
- **Actions** — 13 typed action types with composition, error handling, and optimistic updates
- **Data binding** — reactive state, format expressions, caching, and loading/error/empty states
- **Adaptive layout** — size classes (compact/regular/expanded) with per-section overrides
- **Platform adaptation** — per-target overrides for iOS, Android, and Web behaviors

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

## AI integration (MCP)

OpenUISpec includes an **MCP server** that AI assistants call automatically during UI work — no manual prompting needed.

```
openuispec init → configures MCP for your agent → AI calls tools automatically
```

When you ask your AI to "add a settings page" or "update the home feed," the MCP server provides spec context before generation, feeds authoritative spec contents during generation, validates spec integrity after edits, and returns a spec-derived checklist for the AI to review the generated code against.

15 tools are available as both MCP tools and CLI commands — see the [full reference](./docs/cli.md).

**Using without MCP?** You can provide spec context to any AI manually:

> Generate a native iOS app from this OpenUISpec. Follow all contract UI states, apply token ranges for iOS, and implement navigation flows as defined.

## Examples

| Example | Targets | What it demonstrates |
|---------|---------|---------------------|
| [TaskFlow](./examples/taskflow/openuispec/) | iOS, Android, Web | Compact reference covering all 7 contract families |
| [Todo Orbit](./examples/todo-orbit/openuispec/) | iOS, Android, Web | Bilingual task app with localization, custom contracts |
| [Social App](./examples/social-app/openuispec/) | Android, Web | Trilingual social app with feeds, messaging, profiles |

Screenshots of the generated apps are in the [artifacts](./artifacts/) directory.

## Documentation

| Doc | What's in it |
|-----|-------------|
| [CLI & MCP Tools](./docs/cli.md) | All CLI commands, MCP tools, screenshot params, target workflow |
| [File Formats & Schemas](./docs/file-formats.md) | File types, JSON schemas, output directories, spec sections |
| [Full Specification](./spec/openuispec-v0.1.md) | Complete v0.1 spec (14 sections) |
| [llms-full.txt](https://openuispec.rsteam.uz/llms-full.txt) | Spec + all schemas in one file (for AI consumption) |

## Status

**v0.1 — Draft**. The spec covers all foundational layers with three example apps demonstrating generation across iOS, Android, and Web.

### Roadmap

- [x] Token system, 7 contract families, adaptive layout, action system
- [x] Data binding, i18n, form validation, custom contract extensions
- [x] JSON Schema validation, CLI tool, MCP server
- [x] Drift detection, visual verification (screenshots)
- [x] Example apps: TaskFlow, Todo Orbit, Social App
- [ ] More example apps (e-commerce, dashboard)

## Contributing

OpenUISpec is in early development. If you're interested in contributing — especially around AI code generation, platform-specific expertise, or additional example apps — open an issue to start the conversation.

## License

MIT
