# CLI & MCP Tools Reference

All MCP tools have equivalent CLI commands. The MCP server is used by AI coding agents automatically; the CLI is for manual use and scripts.

## Setup

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

## MCP Tools

### Status & discovery

| Tool | What it does |
|------|-------------|
| `openuispec_status` | Cross-target summary: baselines, drift, next steps |
| `openuispec_spec_types` | Lists all available spec types with descriptions |
| `openuispec_spec_schema` | Returns JSON schema for a spec type. Optional `summary` for top-level overview |

### Spec access

| Tool | What it does |
|------|-------------|
| `openuispec_read_specs` | Without `paths`: returns file listing. With `paths`: loads spec contents |
| `openuispec_get_screen` | Get a single screen spec by name |
| `openuispec_get_contract` | Get a single contract spec, optionally filtered to one variant |
| `openuispec_get_component` | Get a single component spec, optionally filtered to one variant |
| `openuispec_get_tokens` | Get tokens for a specific category |
| `openuispec_get_locale` | Get a single locale file, optionally filtered to specific keys |

### Validation & generation workflow

| Tool | What it does |
|------|-------------|
| `openuispec_validate` | Validate spec files against JSON Schemas, optionally filtered by group |
| `openuispec_check` | Validate spec files (schema + semantic) and check target generation readiness. `audit=true` returns a spec-derived review checklist |
| `openuispec_prepare` | Returns spec context, platform config, constraints. Optional `include_specs` embeds all spec contents |
| `openuispec_drift` | Detect drift, or `snapshot=true` to create/update baseline |

### Visual verification

| Tool | What it does |
|------|-------------|
| `openuispec_preview` | Render a screen spec as HTML with mock data and return a screenshot — no app build needed. **Experimental**: visual approximation, not pixel-accurate |
| `openuispec_screenshot` | Screenshot the web app at a route via headless browser |
| `openuispec_screenshot_android` | Screenshot Android app on emulator. Works with any project via `project_dir` |
| `openuispec_screenshot_ios` | Screenshot iOS app on Simulator via XCUITest. Works with any project via `project_dir` |
| `openuispec_screenshot_web_batch` | Multiple web screenshots in one server session |
| `openuispec_screenshot_android_batch` | Multiple Android screenshots in one build+install cycle |
| `openuispec_screenshot_ios_batch` | Multiple iOS screenshots in one build+install cycle |

The server includes **protocol-level instructions** that trigger on UI-related requests independently of CLAUDE.md rules.

## CLI Commands

### Project setup

```bash
openuispec init                            # Scaffold a new spec project
openuispec init --defaults                 # Non-interactive with unconfirmed defaults
openuispec init --no-configure-targets     # Skip target stack setup
openuispec update-rules                    # Update AI rules to match installed version
openuispec configure-target <t> [--defaults]  # Configure target stack
```

### Validation

```bash
openuispec validate [group...] [--json]    # Validate spec files against JSON Schemas
openuispec validate semantic               # Lint cross-references (locale keys, icons, contracts, tokens)
openuispec check --target <t> [--json]     # Validate spec files + check target generation readiness
```

### Status & generation workflow

```bash
openuispec status [--json]                 # Cross-target baseline/drift status
openuispec prepare --target <t> [--json]   # Build the target work bundle
openuispec drift --target <t> --explain    # Explain semantic spec drift
openuispec drift --snapshot --target <t>   # Snapshot current state + git baseline
```

### Spec access

```bash
openuispec spec-types                         # List available spec types
openuispec spec-schema <type>                 # Get JSON schema for a spec type
openuispec read-specs [paths...]              # Read spec file contents as JSON
openuispec get-screen <name>                  # Get a single screen spec (YAML)
openuispec get-contract <name> [--variant v]  # Get a contract spec
openuispec get-component <name> [--variant v] # Get a component spec
openuispec get-tokens <category>              # Get tokens for a category (YAML)
openuispec get-locale <locale> [--keys k1,k2] # Get a locale file (JSON)
```

### Screenshots

```bash
# Single captures
openuispec screenshot --route /home [--width 1280] [--height 800] [--scale 2] [--theme dark] [--output-dir dir]
openuispec screenshot-android [--project-dir path] [--screen name] [--module name] [--route deeplink]
openuispec screenshot-ios [--project-dir path] [--screen name] [--scheme name] [--bundle-id id]

# Batch — build once, capture many
openuispec screenshot-web-batch --config captures.json [--scale 2] [--theme dark] [--output-dir dir]
openuispec screenshot-android-batch --config captures.json [--project-dir path] [--module name]
openuispec screenshot-ios-batch --config captures.json [--project-dir path] [--scheme name] [--bundle-id id]
```

Screenshot tools work with **any** project — use `--project-dir` to skip manifest lookup.

| Param | Android | iOS | Purpose |
|-------|---------|-----|---------|
| `--project-dir` | yes | yes | Point directly at project root |
| `--module` | yes | -- | Override app module name (default: auto-detect) |
| `--scheme` | -- | yes | Override Xcode scheme (default: auto-detect) |
| `--bundle-id` | -- | yes | Override bundle ID (default: auto-detect) |
| `--route` | yes | -- | Deep link URI for navigation |
| `--nav` | yes | yes | UI tap steps, comma-separated |
| `--scale` | web | -- | Device pixel ratio for sharper screenshots (default: 2) |
| `--theme` | yes | yes | Force light or dark mode |
| `--device` | -- | yes | Simulator device name |
| `--output-dir` | yes | yes | Save screenshot to directory |

### Batch config

All batch commands accept `--config captures.json`. The JSON file has the same structure for all platforms:

```json
{
  "project_dir": "path/to/project",
  "output_dir": "screenshots",
  "scale": 2,
  "theme": "light",
  "captures": [
    { "screen": "home", "route": "/home", "wait_for": 3000 },
    { "screen": "settings", "nav": ["Settings"], "wait_for": 5000 }
  ]
}
```

Each capture supports:
- `screen`: output filename stem (required)
- `route`: deep link URI (Android) or URL path (web)
- `nav`: array of visible-text tap steps after launch (Android, iOS)
- `wait_for`: per-capture wait time in ms
- `selector`: CSS selector to screenshot a specific element (web only)
- `full_page`: capture full scrollable page (web only)
- `init_script`: JavaScript to execute before the page renders (web only — see below)

### `init_script` — app-level initialization

`init_script` lets you inject auth, switch roles, or set up session state before a screenshot is taken — without Puppeteer executing JS directly. The tool base64-encodes the script and appends it as a `?__ous_init=<encoded>` query param. The generated app's bootstrapper reads and runs it before rendering.

**Why app-level instead of `evaluateOnNewDocument`:** the app can `await` login APIs, set framework state, or call any async init — Puppeteer's `evaluateOnNewDocument` is sync-only and has no access to app internals.

**Single capture (MCP):**

```json
{
  "route": "/dashboard",
  "init_script": "window.__auth = { token: 'test-token', role: 'admin' };"
}
```

**Batch capture (MCP):**

```json
{
  "output_dir": "screenshots",
  "init_script": "window.__auth = { token: 'test-token', role: 'viewer' };",
  "captures": [
    { "screen": "dashboard", "route": "/dashboard" },
    { "screen": "admin_panel", "route": "/admin",
      "init_script": "window.__auth = { token: 'test-token', role: 'admin' };" }
  ]
}
```

Per-capture `init_script` overrides the shared one. If neither is set, no param is appended and the app renders normally.

**Bootstrapper contract** — the generated app must include a bootstrapper that:

1. Checks for `__ous_init` in the URL query string on load
2. Base64-decodes it (`atob`) and `eval`s it (or parses it as structured data)
3. Runs **before** rendering authenticated content (can be async — app awaits it)
4. Strips the param from URL/history after processing (`history.replaceState`)

Example bootstrapper (framework-agnostic):

```js
const param = new URLSearchParams(location.search).get('__ous_init');
if (param) {
  try { eval(atob(param)); } catch (e) { console.warn('[ous] init_script error', e); }
  const url = new URL(location.href);
  url.searchParams.delete('__ous_init');
  history.replaceState(null, '', url.toString());
}
```

This is a **contract between the tool and generated code** — the tool appends the param; the app consumes it.

### Preview (experimental)

> **Note:** The preview renderer produces a _visual approximation_ of the spec — it maps contracts to semantic HTML+CSS and applies token values, but does not match the fidelity of a real generated app. Intended for **human inspection only** — AI agents should not use this tool for UI verification and should use `openuispec_screenshot` (or the batch/platform variants) against the real built app instead.

```bash
# MCP tool (intended for human review, not AI verification)
openuispec_preview screen=home size_class=compact theme=light

# No CLI equivalent yet — preview is MCP-only.
```

Parameters:

| Param | Default | Purpose |
|-------|---------|---------|
| `screen` | (required) | Screen name matching `screens/<name>.yaml` |
| `size_class` | `compact` | Adaptive breakpoint: `compact`, `regular`, `expanded` |
| `theme` | `light` | Color theme: `light` or `dark` |
| `locale` | `en` | Locale code for i18n string resolution |
| `viewport` | auto | Custom `{width, height}` — overrides `size_class` defaults |
| `include_html` | `false` | Also return the rendered HTML string |

Preview reads mock data from `openuispec/mock/<screen>.yaml` — see [File Formats](./file-formats.md) for the mock data convention.

## Target Update Workflow

When a shared spec change needs to be applied to a target:

```bash
openuispec validate
openuispec validate semantic
openuispec status
openuispec drift --target ios --explain
openuispec prepare --target ios
# update the ios implementation
openuispec drift --snapshot --target ios
```

- `prepare` runs in `bootstrap` mode for first-time generation and `update` mode after a snapshot exists
- `drift --snapshot` is bookkeeping — it does not prove code matches the spec, and requires the output directory to exist. Only run it after reviewing the generated output.
- Run `openuispec status` between targets to see what still needs updating
