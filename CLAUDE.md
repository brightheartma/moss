# Moss — working notes for Claude

## Working rules

- **No compatibility for uncommitted intermediates.** Anything that only ever
  existed between the last commit and the working tree is an in-flight draft:
  when a refactor supersedes it, replace it wholesale — no aliases, no
  re-exports, no deprecation shims, no migration notes. Delete, don't
  deprecate. Compatibility obligations begin at the first commit that ships a
  thing.
- **Docs move in lockstep with code, in the same change.** ADRs (docs/adr/),
  README + README.zh-CN, CONTEXT.md (glossary only), docs/*.md guides, and
  the _template must never reference a structure that no longer exists.
  Stale references are bugs; delete superseded documents outright.

## Repo facts

- pnpm monorepo. Layering (ADR 0006): `core` (pure machinery — zero chain
  data, zero ABIs) ← `simulator` (verification engine: trace simulation +
  effects reconciliation) / `erc` (the interface layer, ADR 0009: compiled
  standard ABIs `ERC20Abi`/`WETH9Abi` + address-free generic behavior) ←
  `system` (Monad instances: token table data, chain constants,
  address-bearing system adapters) ← `protocols/*` (one package per protocol,
  copy `packages/protocols/_template`) ← `mcp-server` (assembles its served
  catalog itself — no aggregate bundle package). Rule of thumb: anything with
  a hardcoded address lives in `system` or a protocol package, never below.
- Cross-protocol composition (ADR 0009): pass ABIs + addresses (Handles) and
  step builders (`approveStep`); protocol classes go only to
  `registry.use(manifest)` — never into other protocols.
- Registries are empty; assembly is explicit via `registry.use(manifest)`.
- Verify: `pnpm lint` / `pnpm build` / `pnpm typecheck` / `pnpm test` /
  `pnpm test:package`
  (build precedes typecheck — cross-package types resolve through dist). Tests include live
  Monad mainnet e2e (free: Moss never signs/sends); `MOSS_SKIP_E2E=1` when
  offline; sandboxed/proxied environments need `NODE_USE_ENV_PROXY=1` for
  Node fetch and `HOME=$TMPDIR/forge-home` for forge runs.
- Toolchain pins (ADR 0001): TypeScript 6.0.x builds multi-file ESM and
  declarations directly with `tsc`; Vitest 4 is paired with Vite 7/esbuild
  because Vite 8's Oxc cannot lower standard decorators yet. Local gitignored
  `.npmrc` keeps pnpm store in-repo for sandboxed shells.
- ABIs are never hand-written (ADR 0007): compiled via forge + @wagmi/cli, or
  vendored via `update:abis` scripts with test-enforced derivation chains.
- Foundry: `forge init`/`forge install` MUST use `--no-git`; CI fails on any
  git submodule.
