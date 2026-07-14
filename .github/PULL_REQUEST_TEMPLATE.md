## What & why

<!-- What does this PR change, and what problem does it solve? Link the issue if there is one. -->

## Type of change

- [ ] New protocol adapter / capability / query
- [ ] Core / MCP server change
- [ ] Docs / examples
- [ ] Bugfix

## Checklist

- [ ] `pnpm lint && pnpm build && pnpm typecheck && pnpm test && pnpm test:package` passes locally
- [ ] Includes a changeset (`pnpm changeset`) if user-facing

### For new capabilities (required)

- [ ] `intent`, `params` (semantic types), and `risk` labels are all declared
- [ ] The Plan declares `expects` (funds out / in, approvals) built from decoded params
- [ ] Discoverable & loadable: shows up in `discover` and `load` output
- [ ] A reproducible example or e2e test runs `discover → load → action → simulate` against Monad mainnet
- [ ] Simulation produces no warnings for the happy path

## Evidence

<!-- Test output, simulate effects summary, or a short recording. -->
