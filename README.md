# OpenUISpec

> A single source of truth design language for AI-native, platform-native app development.

OpenUISpec is a **semantic UI specification format** that replaces cross-platform frameworks with a declarative design language. Instead of sharing runtime code across platforms, you share the *spec* — and AI generates native SwiftUI, Jetpack Compose, and React code from it.

OpenUISpec is a shared UI sync language for native products, optimized for solo developers but equally usable by teams. It is not a pixel-perfect design format like Figma and it is not a shared runtime like Flutter or React Native. Its job is to keep product intent, interaction contracts, flows, tokens, and platform outputs aligned while still allowing bounded native variation on iOS, Android, and web.

## Why

Cross-platform frameworks (Flutter, React Native, KMP/CMP) solve code duplication by sharing a runtime. OpenUISpec solves it by sharing **intent**:

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

This scaffolds a spec directory, starter tokens, and **configures the MCP server** for your AI coding agent (Claude Code, VS Code/Copilot, Codex). Use `openuispec init --no-configure-targets` to scaffold first and choose target stacks later.

## AI integration (MCP)

OpenUISpec is designed to be used by AI coding agents. The package includes an **MCP server** that exposes tools AI assistants call automatically during UI work — no manual prompting needed.

### How it works

```
openuispec init → configures MCP for your agent → AI calls tools automatically
```

When you ask your AI to "add a settings page" or "update the home feed," the MCP server:

1. **Schema reference** — `openuispec_spec_types` and `openuispec_spec_schema` give the AI the exact format for any spec file it needs to create or edit
2. **Before generation** — `openuispec_prepare` gives the AI your spec context, platform config, and constraints
3. **During generation** — `openuispec_read_specs` feeds the AI the actual spec file contents as the authoritative source
4. **After generation** — `openuispec_check` returns a concrete audit checklist derived from your spec (every contract `must_handle` item, every screen section, every locale key) and the AI verifies its code matches

This replaces the old approach of writing instructions in CLAUDE.md and hoping the AI follows them. MCP tools are called reliably because they're part of the AI's tool-calling loop, not a text instruction it can skip.

### Setup

`openuispec init` and `openuispec update-rules` automatically configure MCP for all supported agents:

| Agent | Config file | Created automatically |
|-------|------------|----------------------|
| **Claude Code** | `.mcp.json` | Always |
| **Codex** | `.codex/config.toml` | Always |
| **VS Code / Copilot** | `.vscode/mcp.json` | If `.vscode/` exists |
| **Gemini CLI** | `.gemini/settings.json` | If `.gemini/` exists |

Manual setup (if needed):

**Claude Code** (`.mcp.json`), **VS Code / Copilot** (`.vscode/mcp.json`), **Gemini CLI** (`.gemini/settings.json`):
```json
{
  "mcpServers": {
    "openuispec": {
      "command": "openuispec",
      "args": ["mcp"]
    }
  }
}
```

**Codex** (`.codex/config.toml`):
```toml
[mcp_servers.openuispec]
command = "openuispec"
args = ["mcp"]
```

Or run directly: `openuispec mcp`

### Tools

| Tool | When | What it does |
|------|------|-------------|
| `openuispec_spec_types` | Before creating spec files | Lists all available spec types with descriptions — discover what kinds of spec files exist |
| `openuispec_spec_schema` | Before creating/editing spec files | Returns the full JSON schema for a specific spec type — exact structure, required fields, allowed values |
| `openuispec_prepare` | Before UI code generation | Returns spec context, platform config, generation constraints |
| `openuispec_read_specs` | Before and after generation | Loads spec file contents — the authoritative source for tokens, screens, contracts |
| `openuispec_check` | After generation | Schema validation + concrete audit checklist from your spec. Optional `screens`/`contracts` params scope the audit |
| `openuispec_validate` | After spec edits | Schema-only validation, optionally filtered by group |
| `openuispec_drift` | Before updates | Detect spec drift since last snapshot, with semantic explanation |
| `openuispec_status` | Anytime | Cross-target summary: baselines, drift, next steps |
| `openuispec_get_screen` | Incremental edits | Get a single screen spec by name — faster than `read_specs` for targeted work |
| `openuispec_get_contract` | Incremental edits | Get a single contract spec, optionally filtered to one variant |
| `openuispec_get_tokens` | Incremental edits | Get tokens for a specific category (color, typography, spacing, etc.) |
| `openuispec_get_locale` | Incremental edits | Get a single locale file, optionally filtered to specific keys |
| `openuispec_screenshot` | Visual verification | Screenshot the web app at a route via headless browser (requires `puppeteer`) |
| `openuispec_screenshot_android` | Visual verification | Screenshot Android app on emulator — builds APK, installs, captures via adb. Works with any Android project via `project_dir` param |
| `openuispec_screenshot_ios` | Visual verification | Screenshot iOS app on Simulator — builds with xcodebuild, captures via XCUITest. Works with any iOS project via `project_dir` param |

The server includes **protocol-level instructions** that trigger on UI-related requests independently of CLAUDE.md rules — so even if CLAUDE.md is buried under other project rules, the MCP enforcement still works.

### Visual verification

The screenshot tools work with **any** Android/iOS/web project — they don't require an OpenUISpec manifest. Use `project_dir` to point directly at a project root:

```
# With OpenUISpec manifest (auto-discovers generated app)
openuispec_screenshot_android(screen: "home")

# Standalone — any Android project
openuispec_screenshot_android(project_dir: "/path/to/android/project", screen: "home")

# Standalone — any iOS project
openuispec_screenshot_ios(project_dir: "/path/to/ios/project", scheme: "MyApp")
```

Additional override params:

| Param | Android | iOS | Purpose |
|-------|---------|-----|---------|
| `project_dir` | yes | yes | Skip manifest, point directly at project root |
| `module` | yes | — | Override app module name (default: auto-detect from `settings.gradle`) |
| `scheme` | — | yes | Override Xcode scheme (default: auto-detect) |
| `bundle_id` | — | yes | Override bundle ID (default: auto-detect from `project.pbxproj`) |

Auto-detection features:
- **Android**: Scans `settings.gradle.kts`/`.gradle` to find the module with `com.android.application` plugin. Supports both Kotlin DSL and Groovy DSL.
- **iOS**: Reads deployment target from `project.pbxproj`. For navigation screenshots, generates an XCUITest project via xcodegen — works with both xcodegen-managed and standalone Xcode projects.

## Using without MCP

You can also use OpenUISpec with any AI by providing context manually:

> Generate a native iOS app from this OpenUISpec. Follow all contract state machines, apply token ranges for iOS, and implement navigation flows as defined. Use `platform/ios.yaml` for SwiftUI-specific overrides.

For platform generation, treat these as hard output constraints:

- Generate a valid native project that bundles every required runtime resource
- Do not ship unresolved resource identifiers (raw locale keys, token refs, placeholder paths)
- Define behavior for every supported size class and form factor

See the examples for reference:

- [TaskFlow](./examples/taskflow/openuispec/) — compact reference spec covering all 7 contract families
- [Todo Orbit](./examples/todo-orbit/openuispec/) — bilingual task app with localization, custom contracts, and generated native/web targets
- [Social App](./examples/social-app/openuispec/) — trilingual social app with feeds, messaging, profiles, and generated Android/web targets

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
│   │   ├── action.schema.json          # 14 action types (discriminated union)
│   │   ├── data-binding.schema.json    # Data sources, state, params
│   │   ├── adaptive.schema.json        # Adaptive override pattern
│   │   └── validation.schema.json     # Validation rule definitions
│   └── validate.ts                     # Validation script (npm run validate)
├── examples/
│   ├── taskflow/                        # Compact reference sample
│   │   ├── openuispec/                  # Source OpenUISpec project
│   │   ├── generated/                   # Generated iOS, Android, and web apps
│   │   ├── README.md                    # Sample overview and structure
│   │   └── AGENTS.md / CLAUDE.md        # AI rules generated from the package
│   ├── social-app/                       # Social app sample (trilingual, Android + Web)
│   └── todo-orbit/                      # Full showcase sample
│       ├── openuispec/                  # Source OpenUISpec project
│       ├── generated/                   # Generated iOS, Android, and web apps
│       ├── README.md                    # Sample overview and structure
│       └── AGENTS.md / CLAUDE.md        # AI rules generated from the package
├── cli/                                 # CLI tool (openuispec init, drift, prepare, validate)
│   ├── index.ts                        # Entry point
│   └── init.ts                         # Project scaffolding + AI rules
├── mcp-server/                          # MCP server (openuispec-mcp)
│   ├── index.ts                        # Stdio transport, 15 tools
│   ├── screenshot.ts                  # Dev server + headless browser screenshot (web)
│   ├── screenshot-shared.ts           # Shared utilities for platform screenshot tools
│   ├── screenshot-android.ts          # Android screenshot via emulator (adb screencap)
│   └── screenshot-ios.ts             # iOS screenshot via Simulator (xcodebuild + XCUITest)
├── scripts/
│   └── take-all-screenshots.ts        # Batch screenshot capture for all example projects
├── artifacts/                           # Screenshot artifacts from generated apps
│   ├── social-app/screenshots/        # Web + Android screenshots
│   ├── todo-orbit/screenshots/        # Web + Android + iOS screenshots
│   └── taskflow/screenshots/          # Web + Android + iOS screenshots
├── check/                               # Composite validation command
│   └── index.ts                        # Schema + semantic + readiness
├── drift/                               # Drift detection (spec change tracking)
│   └── index.ts                        # Hash-based drift checker
├── prepare/                             # Target work bundle generation
│   └── index.ts                        # Baseline-aware target preparation
├── status/                              # Cross-target status summary
│   └── index.ts                        # Baseline/drift overview
├── LICENSE
└── README.md
```

## File formats and schemas

Every file type has a corresponding JSON Schema in `schema/`. **Read the schema before creating or editing a file** — do not guess the structure.

| File | Schema | Root key | Example |
|------|--------|----------|---------|
| `openuispec.yaml` | `openuispec.schema.json` | `spec_version` | [openuispec.yaml](./examples/taskflow/openuispec/openuispec.yaml) |
| `screens/*.yaml` | `screen.schema.json` | `<screen_id>` | [home.yaml](./examples/taskflow/openuispec/screens/home.yaml) |
| `flows/*.yaml` | `flow.schema.json` | `<flow_id>` | [create_task.yaml](./examples/taskflow/openuispec/flows/create_task.yaml) |
| `platform/*.yaml` | `platform.schema.json` | `platform` | [ios.yaml](./examples/taskflow/openuispec/platform/ios.yaml) |
| `locales/*.json` | `locale.schema.json` | (object) | [en.json](./examples/taskflow/openuispec/locales/en.json) |
| `contracts/<name>.yaml` | `contract.schema.json` | `<contract_name>` | [input_field.yaml](./examples/taskflow/openuispec/contracts/input_field.yaml) |
| `contracts/x_*.yaml` | `custom-contract.schema.json` | `<x_name>` | [x_media_player.yaml](./examples/taskflow/openuispec/contracts/x_media_player.yaml) |
| `tokens/color.yaml` | `tokens/color.schema.json` | `color` | [color.yaml](./examples/taskflow/openuispec/tokens/color.yaml) |
| `tokens/typography.yaml` | `tokens/typography.schema.json` | `typography` | [typography.yaml](./examples/taskflow/openuispec/tokens/typography.yaml) |
| `tokens/spacing.yaml` | `tokens/spacing.schema.json` | `spacing` | [spacing.yaml](./examples/taskflow/openuispec/tokens/spacing.yaml) |
| `tokens/elevation.yaml` | `tokens/elevation.schema.json` | `elevation` | [elevation.yaml](./examples/taskflow/openuispec/tokens/elevation.yaml) |
| `tokens/motion.yaml` | `tokens/motion.schema.json` | `motion` | [motion.yaml](./examples/taskflow/openuispec/tokens/motion.yaml) |
| `tokens/layout.yaml` | `tokens/layout.schema.json` | `layout` | [layout.yaml](./examples/taskflow/openuispec/tokens/layout.yaml) |
| `tokens/themes.yaml` | `tokens/themes.schema.json` | `themes` | [themes.yaml](./examples/taskflow/openuispec/tokens/themes.yaml) |
| `tokens/icons.yaml` | `tokens/icons.schema.json` | `icons` | [icons.yaml](./examples/taskflow/openuispec/tokens/icons.yaml) |

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

Use `openuispec validate semantic` to run cross-reference linting for locale keys, formatter refs, mapper refs, contracts, icons, navigation targets, and API endpoint references.

### Shared interactive state roles

Interactive contracts may optionally express state-specific visual roles inside their token maps with a nested `states:` object. This lets generators use explicit foreground/background/icon/border roles for `default`, `active`, `selected`, `pressed`, `focused`, `disabled`, `loading`, and `error` states instead of inferring them from container colors or platform defaults.

Allowed visual role keys (no others are permitted):

- `background`
- `text`
- `icon`
- `border`
- `badge_background`
- `badge_text`

When `states:` is omitted, generators fall back to the token values defined at that level plus the base contract semantics.

## Output directories

By default, drift stores state in `generated/<target>/<project>/`. To point targets to your actual code directories, add `output_dir` to `openuispec.yaml`:

```yaml
generation:
  targets: [ios, android, web]
  extra_rules:
    - "Generation hint strings may start with [common], [ios], [android], or [web] to indicate scope."
  output_dir:
    web: "../web-ui/"
    android: "../kmp-ui/"
    ios: "../kmp-ui/iosApp/"
  code_roots:
    backend: "../api/"
```

Paths are relative to `openuispec.yaml`. The `.openuispec-state.json` file is stored inside each output directory and records spec file hashes plus the git baseline commit metadata captured at snapshot time.

If `api.endpoints` are declared, `generation.code_roots.backend` is required. It should point at the backend folder the AI must inspect when generating API clients or wiring request/response behavior.

`generation.extra_rules` can hold project-wide generation conventions for AI and humans. For example, projects may declare that generation hint strings use prefixes such as `[common]`, `[ios]`, `[android]`, and `[web]` to indicate scope.

`openuispec drift --snapshot --target <target>` requires that target output directory to already exist. If it does not, generate the target code first, then snapshot the accepted baseline.

Use the commands like this:
- `openuispec validate` checks schema correctness
- `openuispec validate semantic` checks cross-references such as locale keys, formatters, mappers, contracts, icons, navigation targets, and API endpoints
- `openuispec init --no-configure-targets` scaffolds the spec project without running the target-stack wizard
- `openuispec configure-target <t>` records and confirms target stack choices in `platform/<target>.yaml`, while still allowing custom framework/library values when the project uses something outside the catalog
- `openuispec drift --target <t> --explain` explains semantic spec changes since that target's accepted baseline
- `openuispec prepare --target <t>` builds the target work bundle for either first-time generation or drift-based updates
- `openuispec status` shows every target's snapshot state, baseline commit, and whether that target is behind the current spec, still needs a baseline, or has not been generated yet

In first-time generation mode, `prepare` also carries target-specific generation constraints such as native localization requirements, multi-file output rules, target folder layout expectations, and a requirement to refresh current platform/framework setup knowledge before code generation.

If stack choices were auto-applied via `configure-target --defaults` or `init --defaults`, they remain unconfirmed. `prepare` will block implementation readiness until the user explicitly confirms the target stack, and AI agents should ask the user to confirm or change those choices instead of silently proceeding to code generation.

When target stack choices come from the preset catalog, `prepare --json` also exposes install-oriented refs for the selected options:
- Android: Gradle plugin ids and library coordinates
- Web: npm package specs
- iOS: package identifiers plus docs links

Those refs are anchors, not a full dependency manifest. The AI is expected to add any supporting build, plugin, repository, annotation-processing, runtime, dev, and test dependencies required by the current platform setup.

If a target snapshot was created before baseline metadata was added, `--explain` and `status` will tell you to re-run `openuispec drift --snapshot --target <target>` for that target.

## Target update workflow

When a shared spec change needs to be applied to a target:

```bash
openuispec validate
openuispec validate semantic
openuispec status
openuispec drift --target ios --explain
openuispec prepare --target ios
# update the ios implementation
# ensure the ios output directory already exists
openuispec drift --snapshot --target ios
```

Meaning:
- `validate` checks schema correctness
- `validate semantic` checks cross-reference integrity
- `status` shows which targets are up to date, need a baseline, or still need generation
- `drift --explain` shows semantic spec changes since that target's accepted baseline
- `prepare` packages the target work bundle for AI/developers. It runs in `bootstrap` mode for first-time generation and `update` mode after a target snapshot exists.
- `drift --snapshot` accepts the updated state after the target UI has been updated and the target output directory exists

Before picking the next platform to update, run:

```bash
openuispec status
```

to see which targets are already up to date and which ones still need to catch up with shared spec changes.

`drift --snapshot` is bookkeeping. It does not prove that the target code matches the spec, and it will not create a missing target output directory for you.

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
| 9. Action system | 14 action types, composition, optimistic updates |
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

**v0.1 — Draft**. The spec covers all foundational layers. TaskFlow provides a compact reference app, Todo Orbit extends coverage with localization, recurring-rule flows, custom contracts, and generated native/web targets, and Social App demonstrates a trilingual social feed app with generated Android and web targets.

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
- [x] MCP server for AI tool integration (`openuispec-mcp`)
- [x] Multi-platform showcase app (`examples/todo-orbit/`)
- [x] Social app example (`examples/social-app/`)
- [ ] More example apps (e-commerce, dashboard)

## Contributing

OpenUISpec is in early development. If you're interested in contributing — especially around AI code generation, platform-specific expertise, or additional example apps — open an issue to start the conversation.

## License

MIT
