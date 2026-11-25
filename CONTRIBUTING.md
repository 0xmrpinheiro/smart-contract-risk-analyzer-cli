# Contributing

Thanks for helping improve `scra`.

## Local setup

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Project layout

- `src/cli`: command wiring and process-facing behavior
- `src/core`: project detection, parsing, import resolution, scoring, and shared types
- `src/rules`: heuristic risk rules
- `src/reporters`: text, JSON, and HTML outputs
- `test/fixtures`: Solidity fixture projects for integration coverage

## Contribution expectations

- Keep the tool fully free and local-first
- Prefer deterministic heuristics over network-dependent features
- Add or update tests alongside rule and pipeline changes
- Document rule behavior and limitations when changing findings

## Continuous integration

CI runs on pull requests and pushes to `main`. It checks lint, types, tests,
the source build, and the documented quickstart. It does not publish to npm.
