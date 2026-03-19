# File Formats & Schemas

Every file type has a corresponding JSON Schema in `schema/`. **Read the schema before creating or editing a file** — do not guess the structure.

## File type reference

| File | Schema | Root key | Example |
|------|--------|----------|---------|
| `openuispec.yaml` | `openuispec.schema.json` | `spec_version` | [openuispec.yaml](../examples/taskflow/openuispec/openuispec.yaml) |
| `screens/*.yaml` | `screen.schema.json` | `<screen_id>` | [home.yaml](../examples/taskflow/openuispec/screens/home.yaml) |
| `flows/*.yaml` | `flow.schema.json` | `<flow_id>` | [create_task.yaml](../examples/taskflow/openuispec/flows/create_task.yaml) |
| `platform/*.yaml` | `platform.schema.json` | `platform` | [ios.yaml](../examples/taskflow/openuispec/platform/ios.yaml) |
| `locales/*.json` | `locale.schema.json` | (object) | [en.json](../examples/taskflow/openuispec/locales/en.json) |
| `contracts/<name>.yaml` | `contract.schema.json` | `<contract_name>` | [input_field.yaml](../examples/taskflow/openuispec/contracts/input_field.yaml) |
| `contracts/x_*.yaml` | `custom-contract.schema.json` | `<x_name>` | [x_schedule_preview.yaml](../examples/todo-orbit/openuispec/contracts/x_schedule_preview.yaml) |
| `components/*.yaml` | `component.schema.json` | `<component_name>` | [media_player.yaml](../examples/taskflow/openuispec/components/media_player.yaml) |
| `tokens/color.yaml` | `tokens/color.schema.json` | `color` | [color.yaml](../examples/taskflow/openuispec/tokens/color.yaml) |
| `tokens/typography.yaml` | `tokens/typography.schema.json` | `typography` | [typography.yaml](../examples/taskflow/openuispec/tokens/typography.yaml) |
| `tokens/spacing.yaml` | `tokens/spacing.schema.json` | `spacing` | [spacing.yaml](../examples/taskflow/openuispec/tokens/spacing.yaml) |
| `tokens/elevation.yaml` | `tokens/elevation.schema.json` | `elevation` | [elevation.yaml](../examples/taskflow/openuispec/tokens/elevation.yaml) |
| `tokens/motion.yaml` | `tokens/motion.schema.json` | `motion` | [motion.yaml](../examples/taskflow/openuispec/tokens/motion.yaml) |
| `tokens/layout.yaml` | `tokens/layout.schema.json` | `layout` | [layout.yaml](../examples/taskflow/openuispec/tokens/layout.yaml) |
| `tokens/themes.yaml` | `tokens/themes.schema.json` | `themes` | [themes.yaml](../examples/taskflow/openuispec/tokens/themes.yaml) |
| `tokens/icons.yaml` | `tokens/icons.schema.json` | `icons` | [icons.yaml](../examples/taskflow/openuispec/tokens/icons.yaml) |
| `mock/<screen>.yaml` | — | `data` / `params` | [analytics.yaml](../examples/todo-orbit/openuispec/mock/analytics.yaml) |

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

## Components

Components are **reusable compositions of contracts with named slots**. They fill the gap between atomic contracts and full-page screens — use them for complex UI blocks like media players, wizards, conversation timelines, and maps.

```
Tokens → Contracts → Components → Screens → Flows
         (atomic)    (composed)    (full page)
```

Each component file lives in `components/*.yaml` with a single root key (the component name). Components define:

- **slots** — named contract instances (e.g. `play_button: { contract: action_trigger }`)
- **layout** — how slots are arranged (stack, row, nested)
- **states** — composite states that hide slots or override slot props (e.g. `playing`, `loading`)
- **variants** — named presets that change layout, hide slots, or override tokens (e.g. `mini`, `fullscreen`)

Screens reference components with `component:` instead of `contract:` and can override individual slots:

```yaml
- component: media_player
  variant: mini
  props:
    source: "{task.attachment.url}"
  slots:
    volume_control: { hidden: true }
    play_button:
      variant: branded
      tokens_override: { background: "color.brand.primary" }
```

**Resolution order:** slot default → variant override → state override → screen-level override. Most specific wins.

Simple custom contracts (`x_entity_status_badge`, etc.) stay as `x_` prefixed contracts — components are for composed UI that has internal layout and state.

## Shared interactive state roles

Interactive contracts may optionally express state-specific visual roles inside their token maps with a nested `states:` object. This lets generators use explicit roles for `default`, `active`, `selected`, `pressed`, `focused`, `disabled`, `loading`, and `error` states.

Allowed visual role keys: `background`, `text`, `icon`, `border`, `badge_background`, `badge_text`.

When `states:` is omitted, generators fall back to the token values defined at that level plus the base contract semantics.

## Output directories

By default, drift stores state in `generated/<target>/<project>/`. To point targets to your actual code directories:

```yaml
generation:
  targets: [ios, android, web]
  output_dir:
    web: "../web-ui/"
    android: "../kmp-ui/"
    ios: "../kmp-ui/iosApp/"
  code_roots:
    backend: "../api/"
```

Paths are relative to `openuispec.yaml`. The `.openuispec-state.json` file records spec file hashes plus the git baseline commit metadata.

- If `api.endpoints` are declared, `generation.code_roots.backend` is required
- `generation.extra_rules` can hold project-wide generation conventions
- `drift --snapshot` requires that target output directory to already exist

## Shared code layers

Projects that share business logic between platforms (e.g. KMP `commonMain`) can declare `generation.shared` to tell AI what code belongs in the shared layer vs platform-specific targets:

```yaml
generation:
  targets: [ios, android, web]
  shared:
    mobile_common:
      platforms: [ios, android]
      language: kotlin
      root: "../shared"
      scope: "Business logic, data models, repositories, API clients, view models. No UI rendering."
      # tracks: [manifest]              # optional — enables hash-based drift detection for this layer
      paths:
        domain: "commonMain/domain/"
        features: "commonMain/features/"
  structure:
    ios:
      root: "../shared"
      scope: "Pure SwiftUI views and navigation. All business logic comes from the shared layer."
      paths:
        ui: "iosApp/ui/"
    android:
      root: "../shared"
      scope: "Pure Compose UI and navigation. All business logic comes from the shared layer."
      paths:
        ui: "androidApp/ui/"
```

- **`scope`** (required on shared, optional on structure) — tells AI what code belongs where. This is the primary mechanism for routing generation work between shared and platform layers.
- **`tracks`** (optional) — when set, enables hash-based drift detection scoped to specific spec categories (`manifest`, `tokens`, `contracts`, `screens`, `flows`, `platform`, `locales`). When omitted, the shared layer relies on `scope` alone.
- **`structure`** — when present, overrides the heuristic code root discovery for a target. Paths are relative to `root`.
- Shared layers are not targets — they are tracked alongside targets in `prepare` and `status` output.
- `openuispec init --with-shared` scaffolds KMP defaults when both ios and android targets are selected.

## Mock data (preview)

The preview renderer reads mock data from `openuispec/mock/<screen>.yaml`. Each file has two optional top-level keys:

```yaml
data:
  tasks: [...]          # binds to $data.tasks in the screen spec
  user: { name: "..." } # binds to $data.user
params:
  id: "task-1"          # binds to $params.id
```

Mock files are not validated by `openuispec validate` and are excluded from drift detection. They exist solely to feed the preview renderer with realistic placeholder data. Preview is intended for **human inspection only** — AI agents should not use it for UI verification.

## Spec sections overview

| Section | What it defines |
|---------|----------------|
| 1. Philosophy | Core principles: semantic, constrained, contract-driven, AI-first |
| 2. Document structure | Project layout and root manifest |
| 3. Token layer | Color, typography, spacing, elevation, motion, layout, themes, icons |
| 4. Component contracts | 7 behavioral families |
| 5. Screen composition | Contract-based layouts, adaptive layout system |
| 6. Navigation flows | Multi-screen journeys with transitions and progress |
| 7. Platform adaptation | Per-target overrides for iOS, Android, Web |
| 8. AI generation contract | Compliance levels (MUST/SHOULD/MAY), validation, drift detection |
| 9. Action system | 14 action types, composition, optimistic updates |
| 10. Data binding & state | Sources, paths, format expressions, reactivity, caching |
| 11. Internationalization | Locale files, `$t:` references, ICU MessageFormat, RTL |
| 12. Custom contract extensions | `x_` prefixed domain-specific contracts |
| 13. Form validation | Validation rules, field dependencies, cross-field checks |
| 14. Development workflow | Dual-workflow model, drift detection, spec as sync layer |

## Manifest: `design` and `generation_guidance`

Two new top-level sections in `openuispec.yaml` shape how AI generators approach design quality.

### `design` — Project brand intent

```yaml
design:
  personality: "Clean, focused, productivity-first — no decorative flourishes"
  complexity: "balanced"          # restrained | balanced | elaborate
  audience: "Individual contributors and small teams"
  avoid:
    - "Do not use color gradients — flat, token-driven color only"
    - "[web] Do not use CSS animations for non-interactive decorative purposes"
```

`complexity` controls how generators apply motion, elevation, and decorative detail:
- `restrained` — required state transitions only, no decorative shadows, clean whitespace
- `balanced` — all motion patterns, full elevation token usage, standard state animations
- `elaborate` — rich animations with staggered reveals, creative elevation, platform flourishes

`avoid` items may use `[web]`/`[ios]`/`[android]` scope tags — same convention as `extra_rules`.

### `generation_guidance` — Universal anti-patterns

```yaml
generation_guidance:
  universal_anti_patterns:
    typography:
      - "Do not fall back to Inter, Roboto, Arial when the spec defines a custom font_family"
    color:
      - "Do not use pure black (#000000) or pure white (#FFFFFF) — resolve through the token layer"
    spacing:
      - "Do not ignore the page_margin and card_padding aliases"
    motion:
      - "Do not ignore reduced_motion — remove animations entirely when the user prefers it"
    elevation:
      - "Do not add shadows to elements that don't specify an elevation token"
    layout:
      - "Do not use pixel breakpoints — reference size classes by name"
    accessibility:
      - "Do not use color as the only differentiator between states"
  audit_threshold: 70             # Minimum score for openuispec check --audit
```

`universal_anti_patterns` appear in the `openuispec prepare` output under `anti_patterns.universal`, filtered by target platform tag. `audit_threshold` is the default minimum score for `openuispec check --audit`.

## Contract and component: `must_avoid`

The `generation` block in contracts, custom contracts, and components now supports `must_avoid` alongside `must_handle`, `should_handle`, and `may_handle`:

```yaml
action_trigger:
  generation:
    must_avoid:
      - "Do not apply gradient backgrounds to buttons — use flat token-defined colors"
      - "Do not use bounce or elastic easing on press feedback"
      - "[ios] Do not add drop shadows to every button variant"
```

Items may use `[web]`/`[ios]`/`[android]` scope tags. Untagged items apply to all platforms. `must_avoid` appears in the `openuispec prepare` output under `anti_patterns.contract_specific`, filtered by target.

## Token: `generation_notes`

Token entries in `typography`, `color`, and `motion` files support sparse `generation_notes` for AI generators:

```yaml
typography:
  font_family:
    primary:
      value: "DM Sans"
      generation_notes:
        - "Never fall back to Inter or Roboto — choose a geometric sans with similar x-height"
        - "[web] Use font-display: swap to prevent FOUT"
        - "[ios] Register the font in Info.plist before first render"
  scale:
    body:
      generation_notes:
        - "This is the most-used text style — ensure line_height is comfortable (1.5 default)"
```

`generation_notes` are sparse — only add them for tokens where AI generators consistently make wrong choices.
