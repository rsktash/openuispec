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

| Tool | When | What it does |
|------|------|-------------|
| `openuispec_spec_types` | Before creating spec files | Lists all available spec types with descriptions |
| `openuispec_spec_schema` | Before creating/editing spec files | Returns JSON schema for a spec type. Optional `summary` for top-level overview |
| `openuispec_prepare` | Before UI code generation | Returns spec context, platform config, constraints. Optional `include_specs` embeds all spec contents |
| `openuispec_read_specs` | Before and after generation | Without `paths`: returns file listing. With `paths`: loads spec contents |
| `openuispec_check` | After spec edits or generation | Spec validation (schema + semantic) + prepare readiness. `audit=true` returns a spec-derived checklist for manual code review |
| `openuispec_validate` | After spec edits | Schema-only validation, optionally filtered by group |
| `openuispec_drift` | Before updates / after generation | Detect drift, or `snapshot=true` to create/update baseline |
| `openuispec_status` | Anytime | Cross-target summary: baselines, drift, next steps |
| `openuispec_get_screen` | Incremental edits | Get a single screen spec by name |
| `openuispec_get_contract` | Incremental edits | Get a single contract spec, optionally filtered to one variant |
| `openuispec_get_tokens` | Incremental edits | Get tokens for a specific category |
| `openuispec_get_locale` | Incremental edits | Get a single locale file, optionally filtered to specific keys |
| `openuispec_screenshot` | Visual verification | Screenshot the web app at a route via headless browser |
| `openuispec_screenshot_android` | Visual verification | Screenshot Android app on emulator. Works with any project via `project_dir` |
| `openuispec_screenshot_ios` | Visual verification | Screenshot iOS app on Simulator via XCUITest. Works with any project via `project_dir` |
| `openuispec_screenshot_web_batch` | Visual verification | Multiple web screenshots in one server session |
| `openuispec_screenshot_android_batch` | Visual verification | Multiple Android screenshots in one build+install cycle |
| `openuispec_screenshot_ios_batch` | Visual verification | Multiple iOS screenshots in one build+install cycle |

The server includes **protocol-level instructions** that trigger on UI-related requests independently of CLAUDE.md rules.

## CLI Commands

### Workflow

```bash
openuispec init                            # Scaffold a new spec project
openuispec init --defaults                 # Non-interactive with unconfirmed defaults
openuispec init --no-configure-targets     # Skip target stack setup
openuispec update-rules                    # Update AI rules to match installed version
openuispec configure-target <t> [--defaults]  # Configure target stack
openuispec validate [group...] [--json]    # Validate spec files
openuispec validate semantic               # Semantic cross-reference linting
openuispec status [--json]                 # Cross-target baseline/drift status
openuispec drift --target <t> --explain    # Explain semantic spec drift
openuispec prepare --target <t> [--json]   # Build the target work bundle
openuispec check --target <t> [--json]     # Composite validation + prepare readiness
openuispec drift --snapshot --target <t>   # Snapshot current state + git baseline
```

### Spec access

```bash
openuispec read-specs [paths...]              # Read spec file contents as JSON
openuispec get-screen <name>                  # Get a single screen spec (YAML)
openuispec get-contract <name> [--variant v]  # Get a contract spec
openuispec get-tokens <category>              # Get tokens for a category (YAML)
openuispec get-locale <locale> [--keys k1,k2] # Get a locale file (JSON)
openuispec spec-types                         # List available spec types
openuispec spec-schema <type>                 # Get JSON schema for a spec type
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
