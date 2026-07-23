# Use Case Card + Flow Map + Demo Scope

> Day 2 deliverable. One user, one intent, one core Action.

## Use Case Card

| Field | Value |
| --- | --- |
| User | Monad DeFi user who wants fixed yield from Pendle PT but will not sign swap calldata they cannot read |
| Problem | PT markets are hard to discover and quote; users fear signing opaque swap calldata. |
| Intent | Buy PT on a verified Pendle market with a known underlying amount. |
| Core Action | `pendle.swap` (buy PT direction) |
| Supporting queries | `pendle.markets`, `pendle.quote` |
| Success result | User sees market context, quote, simulated swap receipt, and confirms before signing. |
| Out of scope this week | Sell PT, YT, LP, limit orders, aggregators, multi-market routing, auto-signing |

## Flow map

```mermaid
flowchart TD
  UserNL[User natural language] --> Agent[Agent]
  Agent --> Moss[Moss MCP]
  Moss --> Markets[pendle.markets]
  Markets --> Quote[pendle.quote]
  Quote --> Confirm{User confirms?}
  Confirm -->|No stop at quote| QuoteResult[Quote result]
  Confirm -->|Yes| Swap[pendle.swap]
  Swap --> Simulate[simulate]
  Simulate --> Receipt[Swap Receipt]
```

| Step | What happens |
| --- | --- |
| User natural language | User asks to buy PT (or explore markets / get a quote) in plain language. |
| Agent | Interprets intent and drives Moss tools; does not invent calldata. |
| Moss MCP | Surfaces Pendle via `discover` / `load` / `action` / `simulate`. |
| `pendle.markets` | Lists verified Pendle markets (API nomination + on-chain checks). |
| `pendle.quote` | Quotes buying PT for a chosen underlying amount. |
| User confirms? | Human gate: stop with quote data, or proceed to swap simulation. |
| Quote result | Path ends with quote data when the user does not confirm a swap. |
| `pendle.swap` | Builds the unsigned buy-PT Capability tree. |
| `simulate` | Trace-simulates the swap; no signing or broadcast. |
| Swap Receipt | Ordered Receipts for human review before any wallet step. |

## Moss Demo Scope

### Real this week

| Component | Notes |
| --- | --- |
| `@themoss/protocol-pendle` | Existing Week 2 adapter (PR #109) |
| `markets` | API nomination + on-chain verification |
| `quote` | RouterStatic quote for buy-PT |
| `swap` + `simulate` | Unsigned Capability tree + trace simulation |
| MCP or CLI driver | `examples/pendle-demo` or Agent via MCP |

### Mock / team-owned

| Component | Notes |
| --- | --- |
| Natural-language UI | Chat or landing page owned by Ops/Frontend |
| Wallet broadcast | Optional; Week 3 minimum stops at simulation + confirmation |
| Portfolio aggregation beyond one market | Out of scope |

### Permission and confirmation

- Agent may call read queries without moving funds.
- Any `swap` path must pause for user review of quote + simulation receipts.
- Wallet signing is never automatic in the demo script.

### Known Issues (starter)

Verified on 2026-07-23 against Monad mainnet.

| Issue | Owner | Status |
| --- | --- | --- |
| PR #109 not merged yet | Dev | Ready for review; `lint` / `build` / `typecheck` / `test` all green locally (325 tests) |
| Simulation prefunds native balance only, so an ERC-20-in swap reverts for a sender holding no underlying | Dev | Worked around: the example defaults to a read-only holder and asserts the balance up front. Root fix is a caller ERC-20 state override on `SimulatorOptions`, proposed upstream and awaiting a decision |
| APY is `inferred` from Pendle API | Research | Must disclose in demo. One market currently reports ~644%, which makes the disclosure concrete rather than theoretical |
| Router / RouterStatic are selector proxies, so the ADR 0007 explorer cross-check cannot compare them | Dev | Recorded as [issue #118](https://github.com/brightheartma/moss/issues/118); MarketFactory is cross-checked, the rest stays on the vendored derivation |
| Dust swaps revert on-chain with `MarketZeroNetLPFee`; the quote path never surfaces it | Dev | Only the simulator's REVERTED backstop catches it, reported as a generic revert. Decoding the selector is proposed upstream with the state-override item |
| Live tests find a holder by scanning Transfer logs; a slow RPC can exhaust the page budget | Dev | Intermittent only, same root cause as the state-override item above |
| Node may reject Monad's RPC certificate chain with `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` | Dev | Environment-only; `NODE_EXTRA_CA_CERTS` workaround documented in the example README |

## This week we will NOT

- Add a second Protocol or chain.
- Build a generic trading Agent.
- Hide Mock components in the pitch.
- Skip human confirmation on asset-moving steps.
