# OpenUISpec v0.1.28

This patch supersedes `v0.1.27`.

## Fixes

- Fixed the drift/prepare onboarding dead-end for targets that have not been generated yet.
  - `drift --snapshot` now keeps the guard against baselining an empty target.
  - Missing-snapshot guidance now tells users to generate the target output first when the output directory does not exist.
- Improved `status` to distinguish:
  - targets that need generation
  - targets that need a baseline snapshot
- Updated workflow docs and generated project templates to describe the generation-first requirement before snapshotting.
- Stabilized the affected CLI tests in this repo by invoking TypeScript entrypoints through the `tsx` loader path instead of the IPC-based binary wrapper.

## Recommended workflow

1. `openuispec validate`
2. `openuispec validate semantic`
3. `openuispec status`
4. `openuispec drift --target <target> --explain`
5. `openuispec prepare --target <target>`
6. update target UI
7. ensure the target output directory exists
8. `openuispec drift --snapshot --target <target>`
