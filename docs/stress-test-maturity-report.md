# OpenUISpec Stress Test & Maturity Assessment

Date: 2026-03-14

## Scope
This assessment stress-tested the project at four layers:

1. **Schema correctness pressure** across both reference specs (`taskflow`, `todo-orbit`).
2. **Type safety and implementation consistency** in the TypeScript toolchain.
3. **Change-tracking workflow resilience** using drift snapshot/check across all declared targets.
4. **Generated output comparison** to verify functional parity across platform outputs without requiring pixel-perfect identity.

## Commands executed

```bash
npm ci
npm run validate                                # from examples/taskflow/openuispec (workspace script)
npx tsx ../../../schema/validate.ts            # from examples/todo-orbit/openuispec
npx tsc --noEmit
for t in ios android web; do
  npx tsx ../../../drift/index.ts --snapshot --target "$t"
  npx tsx ../../../drift/index.ts --target "$t"
done
python - <<'PY'
from pathlib import Path
roots={
  'web':Path('examples/todo-orbit/generated/web/Todo Orbit/src'),
  'ios':Path('examples/todo-orbit/generated/ios/Todo Orbit/Sources/TodoOrbit'),
  'android':Path('examples/todo-orbit/generated/android/Todo Orbit/app/src/main/java/uz/rsteam/todoorbit')
}
for k,r in roots.items():
  code=[p for p in r.rglob('*') if p.is_file() and p.suffix in ['.tsx','.ts','.swift','.kt','.css']]
  loc=sum(sum(1 for _ in p.open('r',encoding='utf-8')) for p in code)
  print(f"{k}: files={len(code)} loc={loc}")
PY
rg --files "examples/todo-orbit/artifacts/screenshots"
```

## Results summary

- **Validation stress**: Passed for both example projects (all manifests, tokens, screens, flows, platform files, locales, and contracts).
- **Compiler stress**: `tsc --noEmit` passed.
- **Workflow stress (drift)**:
  - Initial condition required snapshots (expected for first run).
  - After snapshot creation, all three targets (`ios`, `android`, `web`) reported **0 changed / 0 added / 0 removed**.

## Generated output comparison (functional parity, not pixel parity)

The repository already frames Todo Orbit as a showcase with generated outputs for web, iOS, and Android. In this model, differences in structure/styling between generators or AI agents are expected.

### Comparison policy used

- **Do compare**: coverage of screens/flows/features, data model usage, localization support, and contract intent.
- **Do not require**: identical widget trees, identical naming, exact spacing/typography values, or 1:1 rendered pixels.

### Observed output differences (expected)

- Web output is centralized in a small React surface (`src/App.tsx`, `src/main.tsx`, `src/styles.css`), while iOS/Android split into screen/component/flow files in platform-native patterns.
- Code volume differs by target (`web: 3 files / 3013 LOC`, `ios: 11 files / 1516 LOC`, `android: 11 files / 1992 LOC`), which is normal because generated architecture choices vary by platform and template style.

### Observed output alignment (good)

- All targets include the same core feature set represented in spec: home/tasks, analytics, settings, task editor flow, and recurring-rule flow.
- Localization assets exist for EN/RU in generated native outputs and in web runtime messages.
- Reference screenshots exist for corresponding web and Android screens (`home`, `analytics`, `settings`), indicating practical parity at user-flow level rather than pixel-level equivalence.

## Maturity score (0–5)

- **Specification maturity: 4.0 / 5**
  - Strong: clear schema decomposition, contract model, and examples.
  - Gap: project still explicitly marked **v0.1 Draft**.

- **Implementation maturity: 3.9 / 5**
  - Strong: deterministic validators, lint-like contract usage checks, drift hashing, and multi-target generated examples.
  - Gap: limited automated unit/integration test coverage in root scripts.

- **Operational readiness: 3.7 / 5**
  - Strong: practical CLI workflows for init/validate/drift and documented generated project layout.
  - Gap: baseline onboarding friction for generated app dependency installation can be high in constrained environments.

**Overall maturity estimate: 3.9 / 5 (promising, near early-production for spec tooling, with remaining work in generator conformance automation).**

## What this says about idea–implementation fit

- **Idea fit is high**: the repository architecture matches the thesis (“share semantic intent, generate native apps”).
- **Implementation fit is good**: current tooling already enforces many promised invariants (schema + contract usage + drift).
- **Cross-generator variance is acceptable**: output can differ by coding agent/LLM as long as contract behavior and user flows remain faithful to spec intent.
- **Main risk is ecosystem hardening, not concept validity**: next maturity gains likely come from deeper automated tests, generator conformance tests, and CI reproducibility across generated targets.

## Recommended next stress tests

1. Add a `test` script with unit tests for validator edge-cases (especially custom contracts and malformed wrappers).
2. Add golden-file conformance tests for drift output and schema error formatting.
3. Add CI matrix that validates both examples + executes drift check for all targets.
4. Add conformance checks that compare generated outputs on **feature parity** (screens, flows, actions, i18n keys), not snapshot pixel identity.
5. Add “break tests” (intentionally invalid fixtures) to ensure failure messages stay actionable.
6. Add benchmark scripts for validator runtime and drift checks on scaled synthetic specs.
