# Smart Contract Risk Analyzer

`scra` is a fully free and open-source Solidity smart contract risk analyzer for local projects. It scans local source code, applies deterministic heuristic rules, and produces terminal, JSON, and static HTML reports without API keys or paid services.

## Highlights

- Free and open source under `GPL-3.0-or-later`
- Local-source-only analysis for Solidity contracts
- Supports `Foundry`, `Hardhat`, and plain Solidity folders
- Outputs a human-readable CLI report plus optional JSON and static HTML
- Built for developer workflows and showcase demos

## Install

Published package usage after release:

```bash
npx smart-contract-risk-analyzer analyze .
```

Or install globally:

```bash
pnpm add -g smart-contract-risk-analyzer
scra analyze .
```

## Run From This Repository

```bash
corepack pnpm install
corepack pnpm build
node dist/index.js rules
node dist/index.js analyze ./contracts
```

For source-level local runs without building:

```bash
corepack pnpm run dev -- rules
corepack pnpm run dev -- analyze ./contracts
corepack pnpm exec tsx src/index.ts rules
corepack pnpm exec tsx src/index.ts analyze ./contracts
```

## Usage

```bash
scra analyze ./contracts
scra analyze . --project foundry --html report.html --json report.json
scra analyze ./contracts --min-severity medium --fail-on high
scra rules
```

Repository-local equivalents:

```bash
node dist/index.js analyze ./contracts
node dist/index.js analyze . --project foundry --html report.html --json report.json
node dist/index.js analyze ./contracts --min-severity medium --fail-on high
node dist/index.js rules
```

## Commands

### `scra analyze <target>`

Flags:

- `--project auto|foundry|hardhat|plain`
- `--format text|json`
- `--json <path>`
- `--html <path>`
- `--min-severity low|medium|high|critical`
- `--fail-on low|medium|high|critical`
- `--no-color`

Exit codes:

- `0`: no findings at or above `--fail-on`
- `1`: findings at or above `--fail-on`
- `2`: usage, import-resolution, or parse failure

### `scra rules`

Lists all built-in rules with severity, category, and remediation guidance.

## Built-in Rules

- `external-call-before-state-update`
- `unchecked-low-level-call`
- `tx-origin-auth`
- `delegatecall-usage`
- `selfdestruct-usage`
- `weak-randomness`
- `unbounded-storage-loop`
- `missing-access-control`

## Showcase Outputs

Generated sample reports for the vulnerable fixture live in `docs/examples/`:

- `docs/examples/plain-report.txt`
- `docs/examples/plain-report.json`
- `docs/examples/plain-report.html`

The HTML report includes severity filter buttons and works on desktop and mobile layouts.

## Project Support

- Foundry: `foundry.toml`, `remappings.txt`, `lib/`
- Hardhat: `hardhat.config.*`, `contracts/`, `node_modules/`
- Plain Solidity folders

## Development

```bash
corepack pnpm install
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

## Verified Workflows

These flows were smoke-tested from the built CLI:

```bash
node dist/index.js --help
node dist/index.js analyze --help
node dist/index.js rules --help
node dist/index.js rules --no-color
node dist/index.js analyze test/fixtures/plain-project/contracts/SafeVault.sol --no-color --format json
node dist/index.js analyze test/fixtures/plain-project --no-color --format json --min-severity critical
node dist/index.js analyze test/fixtures/foundry-project --project foundry --no-color
node dist/index.js analyze test/fixtures/hardhat-project --project hardhat --no-color
node dist/index.js analyze test/fixtures/plain-project/contracts/SafeVault.sol --no-color --json tmp/smoke/safe-report.json --html tmp/smoke/safe-report.html
corepack pnpm run dev -- rules --no-color
corepack pnpm run dev -- analyze test/fixtures/hardhat-project --project hardhat --no-color
```

Failure-path behavior was also confirmed:

```bash
node dist/index.js analyze tmp/smoke/Broken.sol --no-color
```

That command exits with code `2` because the import cannot be resolved.

## Limitations

`scra` is a heuristic analyzer. It helps surface common Solidity risk patterns, but it is not a formal verifier and not a substitute for a professional security review or audit.
