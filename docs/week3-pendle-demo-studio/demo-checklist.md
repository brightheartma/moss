# Demo checklist — acceptance and submission package

> Days 4–5. Check items as you complete them.

## Moss Demo acceptance criteria

- [ ] Reuses Week 2 Pendle work (PR #109, adapter package, or this example) — not a fresh onboarding exercise.
- [ ] Exactly one user scenario and one core Action flow (`swap` buy-PT).
- [ ] Research, Ops, and Dev each have visible, documented contributions.
- [ ] Team can explain `User → Agent → Moss → Protocol → Result` end to end.
- [ ] Real implementation, Mock parts, failure points, and Known Issues are labeled.
- [ ] Asset-moving steps include human confirmation and risk disclosure.
- [ ] Demo artifacts exist: recording, repo/README, screenshots or logs.
- [ ] Hackathon Readiness Card drafted for Week 4.

## Team submission package

| Artifact | File / link | Done |
| --- | --- | --- |
| Moss Team Card | [team-card.md](./team-card.md) | [ ] |
| Week 2 evidence links | [PR #109](https://github.com/nishuzumi/moss/pull/109), pendle package, pendle-demo | [ ] |
| Use Case Card + Flow Map | [use-case-and-scope.md](./use-case-and-scope.md) | [ ] |
| Protocol & Risk Brief | [protocol-risk-brief.md](./protocol-risk-brief.md) | [ ] |
| Repo / README / Demo | `examples/pendle-demo` + team fork | [ ] |
| Landing page or project intro | `[PLACEHOLDER]` | [ ] |
| Scenario Test Log | `[PLACEHOLDER]` | [ ] |
| Feedback Log | `[PLACEHOLDER]` | [ ] |
| Team Decision & AI Log | `[PLACEHOLDER]` | [ ] |
| Contribution Statements | one per member | [ ] |
| Hackathon Readiness Card | [hackathon-readiness.md](./hackathon-readiness.md) | [ ] |

## Individual graduation checklist

- [ ] Builder Profile Card submitted.
- [ ] At least one concrete team contribution with evidence.
- [ ] Personal entries in Team Decision & AI Log.
- [ ] ≥1 peer feedback submitted.
- [ ] Team Collaboration Retro completed.

## Day 4 test script (≥3 users)

Ask each tester to phrase a request in their own words, e.g.:

> "I want to buy Pendle PT on Monad with 0.01 USDC worth of underlying — show me the quote first."

Record:

| Tester | Understood market + quote? | Knew confirmation step? | Failure handling clear? | Notes |
| --- | --- | --- | --- | --- |
| 1 | [ ] | [ ] | [ ] | |
| 2 | [ ] | [ ] | [ ] | |
| 3 | [ ] | [ ] | [ ] | |

## Day 5 pitch timing (3 minutes)

| Segment | Duration | Content |
| --- | --- | --- |
| Problem | 30s | User + pain |
| Why Agent + Moss | 45s | Unified capabilities, simulation evidence |
| Live demo | 90s | markets → quote → swap simulate → receipts |
| Boundaries | 30s | Real vs Mock, risks, no auto-sign |
| Next steps | 15s | Roles + Hackathon backlog |

## Demo freeze checklist (end of Day 4)

- [ ] Script frozen; only bugfixes allowed on Day 5.
- [ ] Known Issues list published in README or team doc.
- [ ] Recording environment tested (RPC, MCP, fonts, resolution).
