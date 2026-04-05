# Contributing

Thanks for helping improve `scra`.

## Local setup

```bash
pnpm install
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

## Release flow

- CI runs on pushes and pull requests
- npm publishing is handled by the tag-based GitHub Actions workflow
- Tag releases as `v<version>` after updating `package.json`
