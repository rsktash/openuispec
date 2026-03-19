#!/bin/bash
# Build the OpenUISpec static site for Cloudflare Pages
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$REPO_ROOT/site/_output"

rm -rf "$OUT"
mkdir -p "$OUT/schema/tokens" "$OUT/schema/defs"

# ── index.html from README ───────────────────────────────────────────
cat > "$OUT/index.html" << 'HEADER'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OpenUISpec — Semantic UI Specification</title>
  <meta name="description" content="A semantic UI specification format for AI-native, platform-native app development">
  <style>
    :root { --bg: #fff; --fg: #1a1a2e; --muted: #555; --accent: #2563eb; --border: #e5e7eb; --code-bg: #f4f4f5; --table-stripe: #f9fafb; }
    @media (prefers-color-scheme: dark) {
      :root { --bg: #0f0f23; --fg: #e4e4e7; --muted: #a1a1aa; --accent: #60a5fa; --border: #27272a; --code-bg: #18181b; --table-stripe: #1a1a2e; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--fg); line-height: 1.7; max-width: 860px; margin: 0 auto; padding: 2rem 1.5rem; }
    h1 { font-size: 2rem; margin-bottom: 0.25rem; }
    h2 { font-size: 1.4rem; margin-top: 2.5rem; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border); padding-bottom: 0.3rem; }
    h3 { font-size: 1.1rem; margin-top: 1.5rem; margin-bottom: 0.5rem; }
    p { margin-bottom: 1rem; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    blockquote { border-left: 3px solid var(--accent); padding-left: 1rem; margin: 1rem 0; color: var(--muted); font-style: italic; }
    code { background: var(--code-bg); padding: 0.15em 0.4em; border-radius: 4px; font-size: 0.9em; }
    pre { background: var(--code-bg); padding: 1rem; border-radius: 8px; overflow-x: auto; margin: 1rem 0; }
    pre code { background: none; padding: 0; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { padding: 0.5rem 0.75rem; border: 1px solid var(--border); text-align: left; }
    th { background: var(--code-bg); font-weight: 600; }
    tr:nth-child(even) { background: var(--table-stripe); }
    ul, ol { margin: 0.5rem 0 1rem 1.5rem; }
    li { margin-bottom: 0.25rem; }
    img { max-width: 100%; height: auto; border-radius: 8px; margin: 1rem 0; }
    hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }
    .ai-links { background: var(--code-bg); border-radius: 8px; padding: 1rem 1.5rem; margin: 1.5rem 0; }
    .ai-links h3 { margin-top: 0.5rem; }
  </style>
</head>
<body>
  <div class="ai-links">
    <h3>For AI assistants</h3>
    <ul>
      <li><a href="/llms.txt">llms.txt</a> — concise project summary with links</li>
      <li><a href="/llms-full.txt">llms-full.txt</a> — complete specification + all JSON schemas</li>
    </ul>
  </div>
  <div id="content"></div>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script>
HEADER

# Embed README content as JS string
echo -n '    const md = ' >> "$OUT/index.html"
python3 -c "
import json, sys
content = open('$REPO_ROOT/README.md').read()
print(json.dumps(content) + ';')
" >> "$OUT/index.html"

cat >> "$OUT/index.html" << 'FOOTER'
    document.getElementById('content').innerHTML = marked.parse(md);
  </script>
</body>
</html>
FOOTER

echo "  create index.html"

# ── llms.txt (static, already in site/) ──────────────────────────────
cp "$REPO_ROOT/site/llms.txt" "$OUT/llms.txt"
echo "  create llms.txt"

# ── llms-full.txt (spec + all schemas) ───────────────────────────────
{
  cat << 'PREAMBLE'
# OpenUISpec — Full Reference

> OpenUISpec is a semantic UI specification format for AI-native, platform-native app development. It replaces cross-platform frameworks by sharing intent (YAML spec) instead of runtime code — AI generates native SwiftUI, Jetpack Compose, and React from the same source of truth.

This document contains the complete OpenUISpec v0.2 specification followed by all JSON Schema definitions for validation.

## Quick file format reference

Every file type has a root key and a JSON Schema. Read the schema before creating files.

| File | Schema | Root key |
|------|--------|----------|
| \`openuispec.yaml\` | \`openuispec.schema.json\` | \`spec_version\` |
| \`screens/*.yaml\` | \`screen.schema.json\` | \`<screen_id>\` |
| \`flows/*.yaml\` | \`flow.schema.json\` | \`<flow_id>\` |
| \`platform/*.yaml\` | \`platform.schema.json\` | \`platform\` |
| \`locales/*.json\` | \`locale.schema.json\` | (object) |
| \`contracts/<name>.yaml\` | \`contract.schema.json\` | \`<contract_name>\` |
| \`contracts/x_*.yaml\` | \`custom-contract.schema.json\` | \`<x_name>\` |
| \`components/*.yaml\` | \`component.schema.json\` | \`<component_name>\` |
| \`tokens/color.yaml\` | \`tokens/color.schema.json\` | \`color\` |
| \`tokens/typography.yaml\` | \`tokens/typography.schema.json\` | \`typography\` |
| \`tokens/spacing.yaml\` | \`tokens/spacing.schema.json\` | \`spacing\` |
| \`tokens/elevation.yaml\` | \`tokens/elevation.schema.json\` | \`elevation\` |
| \`tokens/motion.yaml\` | \`tokens/motion.schema.json\` | \`motion\` |
| \`tokens/layout.yaml\` | \`tokens/layout.schema.json\` | \`layout\` |
| \`tokens/themes.yaml\` | \`tokens/themes.schema.json\` | \`themes\` |
| \`tokens/icons.yaml\` | \`tokens/icons.schema.json\` | \`icons\` |

**Important:** Every token file requires a root wrapper key matching its type (e.g. \`tokens/color.yaml\` must start with \`color:\`).

---

PREAMBLE

  echo "## Specification"
  echo ""
  cat "$REPO_ROOT/spec/openuispec-v0.2.md"
  echo ""
  echo "---"
  echo ""
  echo "## JSON Schemas"
  echo ""
  echo "The following JSON Schemas define the valid structure of all OpenUISpec files."
  echo "Use these to validate spec files and understand the expected format."
  echo ""
  echo "### Schema-to-file mapping"
  echo ""
  echo "| Schema | Validates | Root key |"
  echo "|--------|-----------|----------|"
  echo "| \`openuispec.schema.json\` | \`openuispec.yaml\` (root manifest) | \`name\` |"
  echo "| \`screen.schema.json\` | \`screens/*.yaml\` | \`screen\` |"
  echo "| \`flow.schema.json\` | \`flows/*.yaml\` | \`flow\` |"
  echo "| \`platform.schema.json\` | \`platform/*.yaml\` | \`platform\` |"
  echo "| \`locale.schema.json\` | \`locales/*.json\` | (object) |"
  echo "| \`contract.schema.json\` | \`contracts/<name>.yaml\` | \`<contract_name>\` |"
  echo "| \`custom-contract.schema.json\` | \`contracts/x_*.yaml\` | \`<x_name>\` |"
  echo "| \`component.schema.json\` | \`components/*.yaml\` | \`<component_name>\` |"
  echo "| \`tokens/color.schema.json\` | \`tokens/color.yaml\` | \`color\` |"
  echo "| \`tokens/typography.schema.json\` | \`tokens/typography.yaml\` | \`typography\` |"
  echo "| \`tokens/spacing.schema.json\` | \`tokens/spacing.yaml\` | \`spacing\` |"
  echo "| \`tokens/elevation.schema.json\` | \`tokens/elevation.yaml\` | \`elevation\` |"
  echo "| \`tokens/motion.schema.json\` | \`tokens/motion.yaml\` | \`motion\` |"
  echo "| \`tokens/layout.schema.json\` | \`tokens/layout.yaml\` | \`layout\` |"
  echo "| \`tokens/themes.schema.json\` | \`tokens/themes.yaml\` | \`themes\` |"
  echo "| \`tokens/icons.schema.json\` | \`tokens/icons.yaml\` | \`icons\` |"
  echo ""
  echo "**Important:** Every token file requires a root wrapper key matching its type."
  echo "For example, \`tokens/typography.yaml\` must start with \`typography:\` — do NOT"
  echo "put properties like \`font_family:\` at the top level."
  echo ""

  for schema in \
    schema/openuispec.schema.json \
    schema/screen.schema.json \
    schema/flow.schema.json \
    schema/platform.schema.json \
    schema/locale.schema.json \
    schema/contract.schema.json \
    schema/custom-contract.schema.json \
    schema/component.schema.json \
    schema/tokens/color.schema.json \
    schema/tokens/typography.schema.json \
    schema/tokens/spacing.schema.json \
    schema/tokens/elevation.schema.json \
    schema/tokens/motion.schema.json \
    schema/tokens/layout.schema.json \
    schema/tokens/themes.schema.json \
    schema/tokens/icons.schema.json \
    schema/defs/common.schema.json \
    schema/defs/action.schema.json \
    schema/defs/data-binding.schema.json \
    schema/defs/adaptive.schema.json \
    schema/defs/validation.schema.json
  do
    echo "### $schema"
    echo ""
    echo '```json'
    cat "$REPO_ROOT/$schema"
    echo '```'
    echo ""
  done
} > "$OUT/llms-full.txt"

echo "  create llms-full.txt"

# ── JSON schemas (served directly) ───────────────────────────────────
for schema in "$REPO_ROOT"/schema/*.json; do
  cp "$schema" "$OUT/schema/"
done
for schema in "$REPO_ROOT"/schema/tokens/*.json; do
  cp "$schema" "$OUT/schema/tokens/"
done
for schema in "$REPO_ROOT"/schema/defs/*.json; do
  cp "$schema" "$OUT/schema/defs/"
done
echo "  create schema/"

echo ""
echo "Site built at: $OUT"
