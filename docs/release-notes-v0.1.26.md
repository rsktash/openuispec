# OpenUISpec v0.1.26

This release expands OpenUISpec as a spec-management and AI-orchestration tool for multi-platform UI work.

## New features

- `openuispec drift --target <target> --explain`
  Explains semantic spec changes since a target's accepted baseline instead of only reporting file drift.

- Git baseline metadata in `.openuispec-state.json`
  Drift snapshots now record the git baseline commit and branch for each target.

- `openuispec prepare --target <target>`
  Produces an AI-ready target update bundle with:
  - semantic change summary
  - likely code roots
  - candidate target files
  - next-step guidance

- `openuispec validate semantic`
  Adds semantic cross-reference linting for:
  - locale keys
  - formatter refs
  - mapper refs
  - contract refs
  - icon refs
  - navigation targets
  - API endpoint refs
  - submit-form refs

- `openuispec status`
  Shows cross-target snapshot state, baseline metadata, and which targets are behind the current spec.

## Workflow updates

Recommended target workflow is now:

1. `openuispec validate`
2. `openuispec validate semantic`
3. `openuispec status`
4. `openuispec drift --target <target> --explain`
5. `openuispec prepare --target <target>`
6. update target UI
7. `openuispec drift --snapshot --target <target>`

`drift --snapshot` remains a bookkeeping step. It does not prove target code alignment.

## Docs and rule updates

- Public README updated for `--explain`, `prepare`, `validate semantic`, and `status`
- Project scaffolding/rules updated in `init`
- Sample AI rules and sample spec README updated to match the new workflow

## Reliability improvements

- Added regression tests for:
  - `drift --explain` + `prepare`
  - semantic linting
  - cross-target `status`
- CI now runs the test suite in addition to schema validation

## Sample fix

- Fixed Todo Orbit sample semantic linting by adding the missing `pencil` icon token
