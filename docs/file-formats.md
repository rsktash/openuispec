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
| `contracts/x_*.yaml` | `custom-contract.schema.json` | `<x_name>` | [x_media_player.yaml](../examples/taskflow/openuispec/contracts/x_media_player.yaml) |
| `tokens/color.yaml` | `tokens/color.schema.json` | `color` | [color.yaml](../examples/taskflow/openuispec/tokens/color.yaml) |
| `tokens/typography.yaml` | `tokens/typography.schema.json` | `typography` | [typography.yaml](../examples/taskflow/openuispec/tokens/typography.yaml) |
| `tokens/spacing.yaml` | `tokens/spacing.schema.json` | `spacing` | [spacing.yaml](../examples/taskflow/openuispec/tokens/spacing.yaml) |
| `tokens/elevation.yaml` | `tokens/elevation.schema.json` | `elevation` | [elevation.yaml](../examples/taskflow/openuispec/tokens/elevation.yaml) |
| `tokens/motion.yaml` | `tokens/motion.schema.json` | `motion` | [motion.yaml](../examples/taskflow/openuispec/tokens/motion.yaml) |
| `tokens/layout.yaml` | `tokens/layout.schema.json` | `layout` | [layout.yaml](../examples/taskflow/openuispec/tokens/layout.yaml) |
| `tokens/themes.yaml` | `tokens/themes.schema.json` | `themes` | [themes.yaml](../examples/taskflow/openuispec/tokens/themes.yaml) |
| `tokens/icons.yaml` | `tokens/icons.schema.json` | `icons` | [icons.yaml](../examples/taskflow/openuispec/tokens/icons.yaml) |

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
