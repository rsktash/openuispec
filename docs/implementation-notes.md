# Implementation Notes

## Drift baseline metadata

- `.openuispec-state.json` now stores:
  - spec file hashes
  - snapshot timestamp
  - target
  - git baseline metadata: `kind`, `commit`, `branch`
- Snapshot behavior:
  - `kind: git_commit` means the tracked spec files matched `HEAD` exactly at snapshot time
  - `kind: working_tree` means the snapshot was taken from a dirty spec working tree
- This baseline metadata is a pointer to the accepted spec state for a target. It is not a proof that the target UI code is aligned.
- Backward compatibility:
  - older `.openuispec-state.json` files do not include `baseline`
  - `drift --explain` and `status` must report that clearly and ask the user to re-run `openuispec drift --snapshot --target <target>`
  - hash-only snapshots are still valid for basic drift counts

## Drift `--explain`

- Document that `openuispec drift --target <target> --explain` explains **spec changes since that target's own snapshot baseline**, not platform code changes.
- Call out the common cross-platform workflow:
  - iOS developer updates shared spec and iOS code, then snapshots only `ios`
  - Android developer pulls later without updating `generated/android/.../.openuispec-state.json`
  - `openuispec drift --target android --explain` should then show the shared spec changes Android still needs to apply
- Clarify that if another developer also updates and commits a target's `.openuispec-state.json`, that target will no longer see those spec changes as drift.
- Clarify that `--explain` requires an exact `git_commit` baseline. If the snapshot was taken from a dirty working tree, explanations are intentionally unavailable until the target is re-snapshotted from a clean commit.
- Current behavior:
  - compares baseline spec files from git to current working-tree spec files
  - parses YAML/JSON semantically
  - reports property-level changes
  - text and JSON output both include semantic explanations
- Current limitation:
  - explanations are spec-only
  - no platform-code verification is attempted

## `prepare` command

- `openuispec prepare --target <target>` is the operational bridge between the spec and AI implementation work.
- `openuispec configure-target <target>` is the target stack selection step that feeds `prepare`.
  - it should offer preset defaults for known stacks
  - it must still allow custom values when the project uses frameworks or libraries outside the catalog
  - `openuispec init --no-configure-targets` should remain available for users who want to defer target stack decisions until later
  - `--defaults` is an unattended fallback only; it must not count as user confirmation for implementation
- It should support two modes:
  1. bootstrap mode when no target snapshot exists yet
  2. update mode when a target snapshot exists
- It should be documented as:
  1. if no snapshot exists, produce a first-time generation bundle from the manifest and current spec files
  2. if a snapshot exists, compute semantic spec changes since that baseline
  3. produce the target work bundle with likely target scope
- Current output includes:
  - project and target
  - output directory
  - likely code roots
  - mode (`bootstrap` or `update`)
  - baseline commit info when available
  - target stack summary from `platform/<target>.yaml`
  - selected option refs for known preset values
  - semantic change summary for update mode
  - per-spec-file work items or first-time generation spec inventory
  - best-effort candidate target files for update mode
  - next-step guidance
- Selected option refs should be package-manager oriented, not artifact web pages:
  - Android: Gradle plugin ids plus `group:artifact:{latest}` library coordinates
  - Web: npm package specs like `react-router@{latest}`
  - iOS: package identifiers plus docs links
- `prepare` must also carry dependency guidance explaining that these refs are anchors only.
  - AI should add supporting build, plugin, repository, annotation-processing, runtime, dev, and test dependencies required by the chosen stack and current toolchain
  - AI should resolve exact versions and wiring from current platform docs instead of assuming the preset list is exhaustive
- Bootstrap mode should surface soft warnings when configured framework/stack values are custom and therefore not covered by preset dependency refs.
  - these warnings should explain that dependency guidance is incomplete, not silently omit the missing refs
- Bootstrap mode should also surface pending stack confirmation when values were auto-applied from defaults.
  - `generation_ready` must remain false in that state
  - AI consumers should ask the user to confirm or change the stack before starting implementation
- Bootstrap mode should also carry explicit generation constraints for the target:
  - localization rules
    - use target-native runtime localization resources
    - forbid in-memory string maps embedded in app code
  - file structure rules
    - forbid single-file app output
    - require separate screen/component/support/resource modules
  - platform setup rules
    - refresh current target/framework setup guidance before generation
    - do not rely on stale memory for project layout, resource wiring, navigation APIs, or packaging conventions
  - target-specific directory expectations for generated code
  - backend generation context
    - if the manifest declares `api.endpoints`, `generation.code_roots.backend` is required
    - `prepare` should surface the resolved backend root so AI can inspect backend code when generating API clients
- Shared code layers (`generation.shared`):
  - when configured, `prepare` includes `shared_layers` in its output with per-layer `scope`, `already_generated`, and `guidance`
  - `scope` tells AI what code belongs in the shared layer vs the platform target — this is the primary routing mechanism
  - optional `tracks` enables hash-based drift detection scoped to specific spec categories
  - `generation.structure` overrides heuristic code root discovery when present, and its `scope` field tells AI what goes in the platform-specific target
  - `suggestCodeRoots` includes shared layer roots and structure paths alongside target output directories
  - generation rules include shared layer and target scope descriptions
- Important positioning:
  - `prepare` does not generate code
  - `prepare` does not verify code correctness
  - `prepare` packages either the current spec or the spec delta into scoped implementation work for AI or developers

## Semantic linting

- `openuispec validate semantic` is now the high-signal semantic consistency pass on top of schema validation.
- Current checks:
  - locale key references from `$t:...`
  - formatter references from `format:...`
  - mapper references from `map:...`
  - contract references
  - icon references
  - screen/flow destination references
  - API endpoint references
  - submit-form `form_id` references
  - locale coverage against the default locale
- Token validation behavior:
  - validates app-level references for `color.*`, `spacing.*`, `typography.*`, and `elevation.*`
  - token resolution is normalized to actual token-family shapes, not raw YAML object paths
  - skips dynamic token expressions such as `color.priority.{task.priority}`
  - skips token-default checking inside contract definition files to avoid false positives on contract-local token names
- Icon validation behavior:
  - uses icon registry + custom icons + declared variant suffixes
  - treats generated variants like `checkmark_list_fill` as valid when the base icon exists and `_fill` is a declared suffix
  - skips dynamic/data-driven icon strings such as `item.icon` or `{project.icon}`
- Current limitation:
  - semantic lint is intentionally heuristic
  - it validates stable cross-references, not full behavioral correctness

## `status` command

- `openuispec status` is the cross-target overview command.
- Current output includes, per target:
  - output directory
  - whether the output directory exists
  - snapshot present or missing
  - snapshot timestamp
  - baseline kind / commit / branch
  - changed / added / removed spec file counts
  - `behind` boolean
  - `explain_available` boolean
  - note for missing or legacy snapshots
- Important positioning:
  - `status` answers "which targets are behind shared spec changes?"
  - `status` should distinguish "needs generation" from "needs baseline"
  - `status` does not verify code alignment
- Real-world behavior to document:
  - if `web` was re-snapshotted after the new baseline metadata was added, but `ios` and `android` still have older state files, `status` should show:
    - `web`: baseline available, explain available
    - `ios` / `android`: snapshot exists, but no baseline metadata, explain unavailable with re-snapshot note

## Workflow docs follow-up

- Recommended target workflow now is:
  1. `openuispec validate`
  2. `openuispec validate semantic`
  3. `openuispec status`
  4. `openuispec drift --target <target> --explain`
  5. `openuispec prepare --target <target>`
  6. update target UI code
  7. build/run and review
  8. ensure the target output directory exists
  9. `openuispec drift --snapshot --target <target>`
- `drift --snapshot` should continue to be described as bookkeeping/baselining, not as proof that the target implementation matches the spec.
- If the target output directory does not exist yet, the CLI should direct the user to run code generation first instead of implying that snapshot can initialize an empty target.

## Design quality audit

`openuispec check --audit` runs design quality heuristics against token and contract files, returning a numeric score (`max(0, 100 - errors × 10 - warnings × 3)`) and categorized findings. The `audit_threshold` in `generation_guidance` sets a project-wide minimum; `--min-score N` overrides per-run.

`openuispec prepare` includes `anti_patterns` (universal + contract-specific + project-specific, filtered by target platform) and `design_context` (personality, complexity, audience, complexity_rule) in its output when the manifest defines `generation_guidance` and `design` sections.

`generation.extra_rules` in the manifest is included in prepare output and filtered by platform tag.
