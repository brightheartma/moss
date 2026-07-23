# Hackathon Readiness Card

> Day 5 deliverable. What carries into Week 4 and what stays behind.

## Demo summary

| Field | Value |
| --- | --- |
| Project name | `[PLACEHOLDER]` |
| One-liner | PT Yield Assistant on Monad via Moss Pendle adapter |
| Core flow proven | `markets` → `quote` → `swap` simulate → receipt review |
| Week 2 base | [Pendle adapter PR #109](https://github.com/nishuzumi/moss/pull/109) + `examples/pendle-demo` |

## What worked

| Area | Evidence |
| --- | --- |
| Technical | `[PLACEHOLDER — e.g. live simulation on Monad, MCP path]` |
| Research | `[PLACEHOLDER — risk brief informed confirmation copy]` |
| Ops | `[PLACEHOLDER — test users understood quote step]` |

## What is still Mock or incomplete

| Item | Plan for Hackathon |
| --- | --- |
| Natural-language UI | `[PLACEHOLDER]` |
| Wallet send on mainnet | `[PLACEHOLDER — local fork vs preview only]` |
| PR #109 merge status | `[PLACEHOLDER]` |
| `[PLACEHOLDER]` | `[PLACEHOLDER]` |

## Hackathon backlog (prioritized)

| Priority | Item | Owner | Depends on |
| --- | --- | --- | --- |
| P0 | `[PLACEHOLDER — e.g. merge Pendle PR]` | Dev | Maintainer review |
| P0 | `[PLACEHOLDER — e.g. Agent MCP prompt + confirmation UX]` | Ops/Dev | Demo freeze feedback |
| P1 | `[PLACEHOLDER — e.g. sell-PT path]` | Dev | P0 |
| P1 | `[PLACEHOLDER — e.g. portfolio summary across markets]` | Research/Ops | `markets` query |
| P2 | `[PLACEHOLDER]` | `[ROLE]` | `[PLACEHOLDER]` |

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

## 15-second pitch closer (template)

"We proved one Moss path for Pendle PT on Monad. Next hackathon we `[PLACEHOLDER]` so users can
`[PLACEHOLDER]` with the same safety model: simulate first, confirm always."
