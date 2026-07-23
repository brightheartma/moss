# Demo checklist — acceptance and submission package

> Days 4–5. Check items as you complete them.

## Moss Demo acceptance criteria

- [x] Reuses Week 2 Pendle work (PR #109, adapter package, or this example) — not a fresh onboarding exercise.
- [x] Exactly one user scenario and one core Action flow (`swap` buy-PT).
- [ ] Research, Ops, and Dev each have visible, documented contributions.
- [x] Team can explain `User → Agent → Moss → Protocol → Result` end to end — the `mcp` script walks it over the real protocol.
- [x] Real implementation, Mock parts, failure points, and Known Issues are labeled.
- [x] Asset-moving steps include human confirmation and risk disclosure.
- [ ] Demo artifacts exist: recording, repo/README, screenshots or logs.
- [ ] Hackathon Readiness Card drafted for Week 4.

## Verified run (2026-07-23, Monad mainnet)

Recorded so Day 5 can be rehearsed against a known-good baseline.

| Step | Command | Result |
| --- | --- | --- |
| markets | `pnpm --filter @themoss/example-pendle-demo markets` | 4 verified markets |
| quote | `pnpm --filter @themoss/example-pendle-demo quote` | 0.01 underlying → ~0.010077 PT, min 0.010026 @ 50 bps |
| swap | `pnpm --filter @themoss/example-pendle-demo swap` | approve + Router both simulate clean, no warnings |
| **mcp** | `pnpm --filter @themoss/example-pendle-demo mcp` | Four tools reachable; `load` returns `risk = fundOut, approval, priceImpact`; `simulate` returns `ok: true` |
| repo checks | `pnpm lint` / `build` / `typecheck` / `test` | 325 tests passed |

Swap receipt shows the full ordered chain: `Approval` → `Transfer` → `SY.Deposit` →
`YT.NewInterestIndex` → `Market.Swap`, ending in `buy-pt: 10000 underlying -> 10077 PT`.

Failure path is worth rehearsing too — `MOSS_ACCOUNT=0xcccc…cccc` yields:

```
demo sender 0xcccc… holds 0 USDat but the swap needs 0.01.
Set MOSS_ACCOUNT to an address holding USDat, or lower MOSS_SWAP_AMOUNT.
```

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

## Working schedule (compressed — Saturday is the last day)

Pulled one day forward from the original Day 1–5 map. Thursday counts as Day 3 because the
weekend is available.

| When | Day | Must produce | Note |
| --- | --- | --- | --- |
| Thu (done) | 3 | Demo verified end to end; Cards drafted; pitch script | Technical work complete |
| **Thu evening** | — | **Line up the ≥3 testers now** | Only step that depends on other people's time — book it before the content is ready |
| Fri (day) | 4 | Recording | Run `mcp` once first to confirm the demo holder still has balance. Record before reading messages |
| Fri (evening) | 4 | Collect tester feedback; send the PR follow-up if still unanswered | Friday leaves the maintainer the weekend; Saturday does not |
| **Sat** | **5** | **Final day** — Decision & AI Log, contribution statement, submission package | |
| Sun | — | Verify hackathon Plan B if PR #109 is still unmerged | Not a Week 3 deliverable; kept off the critical path |

**Plan B** (hackathon only): the product repo depends on `@themoss/protocol-pendle` from a git
dependency on the fork instead of npm. Prove it installs and runs one `markets` query before the
hackathon starts — do not discover a broken dependency on day one.

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

## Demo freeze checklist (end of Friday)

- [ ] Script frozen; only bugfixes allowed on Saturday.
- [x] Known Issues list published — [use-case-and-scope.md](./use-case-and-scope.md).
- [ ] Recording environment tested (RPC, MCP, fonts, resolution).
- [ ] `pnpm build` run, `NODE_EXTRA_CA_CERTS` exported, `mcp` dry-run green.
