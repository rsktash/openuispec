# OpenUISpec v0.1.27

This patch supersedes `v0.1.26`.

## Fix

- Fixed npm install / publish lifecycle breakage caused by naming the repo script `prepare`.
  - The package now uses `prepare:target` for the repo-local helper script.
  - `openuispec prepare --target <target>` remains the CLI command.

## Includes from v0.1.26

- `openuispec drift --target <target> --explain`
- git baseline metadata in `.openuispec-state.json`
- `openuispec prepare --target <target>`
- `openuispec validate semantic`
- `openuispec status`
- updated workflow docs, AI rules, tests, CI, and sample fixes

## Recommended workflow

1. `openuispec validate`
2. `openuispec validate semantic`
3. `openuispec status`
4. `openuispec drift --target <target> --explain`
5. `openuispec prepare --target <target>`
6. update target UI
7. `openuispec drift --snapshot --target <target>`
