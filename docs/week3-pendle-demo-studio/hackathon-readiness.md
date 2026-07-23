# Hackathon Readiness Card

> Day 5 deliverable. What carries into Week 4 and what stays behind.

## Demo summary

| Field | Value |
| --- | --- |
| Project name | PT Yield Assistant |
| One-liner | PT Yield Assistant on Monad via Moss Pendle adapter |
| Core flow proven | `markets` → `quote` → `swap` simulate → receipt review |
| Week 2 base | [Pendle adapter PR #109](https://github.com/nishuzumi/moss/pull/109) + `examples/pendle-demo` |

## What worked

| Area | Evidence |
| --- | --- |
| Technical | Full markets → quote → swap → simulate flow runs clean against Monad mainnet; receipts carry the exact ordered event chain, no warnings |
| Technical | Building the example surfaced a real framework gap (no caller ERC-20 funding for simulation) that is now an upstream proposal, not a local hack |
| Research | Risk labels and the `inferred` APY provenance drove the confirmation copy; a market currently reporting ~644% makes the disclosure concrete |
| Ops | `[PLACEHOLDER — fill after Day 4 tests]` |

## What is still Mock or incomplete

| Item | Plan for Hackathon |
| --- | --- |
| Natural-language UI | None in Week 3 by decision; CLI + MCP only. Week 4 builds the trade desk |
| Wallet send on mainnet | Out of scope by design — Moss never signs or sends. Stays a human wallet step |
| PR #109 merge status | Ready for review as of 2026-07-23, all local checks green. Merge unblocks an npm dependency for Week 4 |
| Simulator caller funding | Awaiting an upstream decision; the example depends on a third-party wallet's balance until then |

## Week 4 repository decision

The hackathon product gets **its own public repository**, with Moss as a dependency — not another
branch on the Moss fork. The adapter is a contribution to Moss and belongs upstream; the product is a
consumer of Moss and belongs on its own. A standalone repo also keeps the commit history legible as
hackathon-period work instead of burying it under upstream history.

`@themoss/core`, `@themoss/erc`, and `@themoss/system` are already on npm at `0.1.0`.
`@themoss/protocol-pendle` is not, so merging PR #109 is what makes the dependency clean.

## Hackathon backlog (prioritized)

| Priority | Item | Owner | Depends on |
| --- | --- | --- | --- |
| P0 | Land PR #109 so the adapter is an npm dependency | Dev | Maintainer review |
| P0 | Stand up the standalone product repo with Moss as a dependency | Dev | P0 above, or a temporary git dependency |
| P0 | Trade desk UI: markets list, quote, confirm, simulation receipt | Frontend/Dev | Demo freeze feedback |
| P1 | Render receipts as plain language — net in/out and approval granted | Dev | Trade desk UI |
| P1 | Sell-PT path in the product surface | Dev | P0 |
| P1 | Resolve the two open simulator items (caller funding, dust decode) | Dev | Upstream decision |
| P2 | Portfolio summary across verified markets | Research/Ops | `markets` query |

## Risks to carry forward

- PT expiry and liquidity; always show `expiryUtc` in UI.
- Inferred APY must stay labeled; never auto-execute on APY alone.
- Simulation failures must block signing.

## Team ask for Week 4

| Need | Detail |
| --- | --- |
| Mentors | `[PLACEHOLDER]` |
| Infra | Monad RPC, MCP hosting |
| Skills gap | `[PLACEHOLDER]` |

## 15-second pitch closer

"We proved one Moss path for Pendle PT on Monad — and along the way found a gap in the framework
itself, which is now an open proposal upstream. Next hackathon we put a trade desk on top of it, so
users can buy fixed yield without reading calldata, under the same safety model: simulate first,
confirm always, never sign for you."
