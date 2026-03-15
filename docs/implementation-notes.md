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

- `openuispec prepare --target <target>` is the operational bridge between spec drift and AI implementation work.
- It should be documented as:
  1. read the target's snapshot baseline
  2. compute semantic spec changes since that baseline
  3. produce an AI-ready bundle with likely target scope
- Current output includes:
  - project and target
  - output directory
  - likely code roots
  - baseline commit info
  - semantic change summary
  - per-spec-file work items
  - best-effort candidate target files
  - next-step guidance
- Important positioning:
  - `prepare` does not generate code
  - `prepare` does not verify code correctness
  - `prepare` packages the spec delta into scoped implementation work for AI or developers

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
