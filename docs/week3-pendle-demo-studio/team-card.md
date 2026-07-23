# Moss Team Card

> Day 1 deliverable. Replace `[PLACEHOLDER]` before sharing with mentors.

## Team

| Field | Value |
| --- | --- |
| Team name | `[PLACEHOLDER — 你来起]` |
| Track | Moss Collaboration Demo Studio |
| Demo framing | PT Yield Assistant (Monad Protocol Demo) |
| Team size | 1 (solo) |

## Members

Solo team. Every role below is carried by the same person; the split is kept so the
responsibilities stay visible rather than implied.

| Name | Role | Moss familiarity | Week 3 focus |
| --- | --- | --- | --- |
| [brightheartma](https://github.com/brightheartma) | Dev Builder | Pendle adapter author; [PR #109](https://github.com/nishuzumi/moss/pull/109) | Agent → Moss → Pendle integration |
| 同上 | Research Builder | Same person | Protocol & Risk Brief; risk labels and `inferred` APY disclosure |
| 同上 | Ops Builder | Same person | Demo story, NL testing, Mini Demo Day pitch |
| — | Frontend (optional) | Not staffed | **Skipped for Week 3 by decision** — CLI + MCP + recording only; UI is Week 4 |

## Week 2 evidence links

| Artifact | Link |
| --- | --- |
| Pendle adapter PR | https://github.com/nishuzumi/moss/pull/109 (in review with maintainer) |
| Dev GitHub | https://github.com/brightheartma |
| Protocol package | [`packages/protocols/pendle`](../../packages/protocols/pendle) |
| Week 3 example | [`examples/pendle-demo`](../../examples/pendle-demo) |
| Protocol research / design draft | [共享理解｜Moss Demo Studio × Pendle Base](https://app.notion.com/p/3a5c278534e581f69cbbd7fec1a37984) |
| Related issues | [#118 — abi-tools explorer cross-check for selector-proxy contracts](https://github.com/brightheartma/moss/issues/118), filed from the Router / RouterStatic probe during PR #109 |
| Demo branch | [`demo/week3-pt-yield-assistant`](https://github.com/brightheartma/moss/tree/demo/week3-pt-yield-assistant) |

## Proposed demo (one sentence)

A yield-focused user asks in natural language to buy Pendle PT on Monad; the Agent calls Moss
`markets` and `quote`, builds a buy-PT `swap`, simulates it, and presents receipts for explicit
human confirmation before any signing.

## Role confirmation (Day 1)

- [x] Who knows Moss well enough to explain `discover → load → action → simulate`? — Dev; the
      [`mcp` example](../../examples/pendle-demo/src/mcp.ts) walks all four tools against mainnet.
- [x] Who owns user scenarios, protocol risks, and confirmation boundaries? — Dev wearing the
      Research hat; see [protocol-risk-brief.md](./protocol-risk-brief.md).
- [x] Who owns demo narrative, user testing, and Mini Demo Day pitch? — Dev wearing the Ops hat;
      pitch script drafted, NL testing still to run.

## Communication

Solo team, so these are working locations rather than coordination channels.

| Channel | Link |
| --- | --- |
| Team chat | N/A (solo) |
| Shared doc / repo | Notes: `/Users/johnma/projects/moss-pendle-demo-studio` (git-tracked). Code: [fork](https://github.com/brightheartma/moss) |
| Notion workspace | [Week 3 overview](https://app.notion.com/p/3a5c278534e581afa7a0dccc0a102d4e) |
| Standup time | N/A (solo); session logs in the notes folder serve as the daily record |
