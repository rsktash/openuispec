# TaskFlow — OpenUISpec

This directory contains the **OpenUISpec** semantic UI specification for **TaskFlow**.

**Start here:** read `openuispec.yaml` — it defines the project structure, data model, API endpoints, and generation targets (**ios, android, web**).

## Directory structure

| Directory | Contents |
|-----------|----------|
| `tokens/` | Design tokens — colors, typography, spacing, elevation, motion, icons, themes |
| `screens/` | Screen definitions — one YAML file per screen |
| `flows/` | Navigation flows — multi-step user journeys |
| `contracts/` | Component contracts — standard extensions and custom (`x_` prefixed) |
| `platform/` | Platform overrides — per-target (iOS, Android, Web) behaviors |
| `locales/` | Localization — i18n strings (JSON, ICU MessageFormat) |

## IMPORTANT — Read the specification before working with spec files

The spec format, file schemas, and generation rules are defined in the installed `openuispec` package.
You MUST read these reference files before creating, editing, or generating from any spec file.
Do NOT guess the file format — skipping this step will produce invalid YAML that fails validation.

**Find the package in this order:**
1. `node_modules/openuispec/` (project dependency)
2. Run `npm root -g` → `<prefix>/openuispec/` (global install)
3. Online: `https://openuispec.rsteam.uz/llms-full.txt` (if not installed)

**Reference files inside the package (read in this order):**
1. `README.md` — schema tables, file format reference, root keys
2. `spec/openuispec-v0.1.md` — full specification (contracts, layout, expressions, etc.)
3. `examples/taskflow/openuispec/` — complete working example with all file types
4. `schema/` — JSON Schemas for validation

## CLI commands

```bash
openuispec validate             # Validate spec files against schemas
openuispec validate semantic    # Check semantic cross-references
openuispec validate screens     # Validate only screens
openuispec status               # Show which targets are behind
openuispec drift --target ios --explain   # Explain semantic spec drift since ios baseline
openuispec prepare --target ios           # Build an AI-ready ios update bundle
openuispec drift --snapshot --target ios  # Snapshot current state + git baseline after ios output exists
```

## Learn more

Docs: https://openuispec.rsteam.uz
