# Decision & AI Log

> Week 3 submission artifact. What was decided, why, and where AI assistance changed the outcome.
> Solo team, so every entry is the same person unless noted.

## Decisions

| # | Decision | Alternatives considered | Why this one | Date |
| --- | --- | --- | --- | --- |
| 1 | Scenario locked to **PT Yield Assistant**, core Action `pendle.swap` buy-PT | Sell-PT as the headline; a multi-protocol agent | Week 3 requires exactly one scenario and one Action; buy-PT is the direction with the cleanest user story | 07-22 |
| 2 | **No UI in Week 3** — CLI + MCP + recording only | A thin single-page trade desk | Solo team; a half-built UI would cost the time that documentation and pitch needed. UI is Week 4's deliverable | 07-23 |
| 3 | **Rejected** a generic "transaction explainer" product direction | Building it as the Week 3 demo | It needed a new simulator surface plus an ADR (~3–4 days) and contradicted the locked one-scenario scope. Moved to the Week 4 backlog as a differentiator | 07-23 |
| 4 | Demo runs on the fork; **say so plainly** in the pitch | Downplaying the PR status | Honest framing reads as an upstream contribution in progress, not as a gap | 07-23 |
| 5 | Split branches: adapter fix on `feat/pendle-adapter` (PR #109), demo and docs on `demo/week3-pt-yield-assistant` | Keeping everything on the PR branch | A reviewer should not have to read Week 3 coursework to review an adapter. Matches the project's own open-source guidance: PRs stay self-contained | 07-23 |
| 6 | Exported `PendleMarketView` / `PendleQuoteView` **into PR #109** rather than patching locally | Carrying it as a fork-only patch; a separate PR after merge | Both types are documented as public shapes of the `markets` / `quote` Queries and appear in their return signatures — the missing export was a defect, not a demo convenience. The PR was still Draft, so the cost of adding it was near zero | 07-23 |
| 7 | Demo defaults to a **read-only holder address** plus an up-front balance assertion | Runtime holder discovery, as the live tests do; a simulator change | Reproducibility beats generality for a demo. Holder scanning is the known-flaky path and a live demo should not gamble on RPC luck | 07-23 |
| 8 | Week 4 hackathon product gets its **own repository**, Moss as a dependency | Another branch on the Moss fork | The adapter is a contribution *to* Moss; the product is a consumer *of* Moss. A standalone repo also keeps hackathon-period commits legible instead of buried under upstream history | 07-23 |
| 9 | **Do not chase the maintainer yet**; follow up Friday if still silent | Sending the follow-up immediately | Flipping the PR to Ready is itself the stronger signal and went out the same day. The PR had been in Draft at the maintainer's own request | 07-23 |
| 10 | Cards stay in the `moss` repo; notes folder holds session logs and planning only | Copying Cards into the notes folder for cross-tool editing | One home per document. Duplicates fork the moment either side is edited, and Cards contain repo-relative links | 07-23 |
| 11 | Schedule compressed — **Saturday is the last day** | Running through Sunday | User preference for buffer. Plan B verification was kept off the critical path since it is hackathon prep, not a Week 3 deliverable | 07-23 |

## AI assistance log

Tooling: Claude (Claude Code) for implementation, verification, and drafting.
Everything below was reviewed and accepted by the human before landing.

| Area | What AI did | What it got wrong or needed correcting |
| --- | --- | --- |
| Demo verification | Ran all three CLI paths and the full MCP path against Monad mainnet; found the main path could never have worked | — |
| Root-cause analysis | Traced the `swap` revert to a zero token balance, not the previously recorded dust / `MarketZeroNetLPFee` issue | **Initially assumed the dust issue was the cause**, carried over from an earlier note. Checking the on-chain balance disproved it |
| MCP verification | Wrote a client that speaks MCP over stdio, later promoted to `examples/pendle-demo/src/mcp.ts` | **Misread two fields** — reported `risk` as empty (the field is singular, not `risks`) and `reverted` as undefined (MCP's simulate output is deliberately reduced). Both were reading errors, not product defects |
| Environment | Diagnosed `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` as Node's bundled CA list missing the issuer for Let's Encrypt's `YR1` intermediate | **First tried disabling TLS verification**, which was correctly blocked. The right fix was pointing Node at the system roots |
| Documentation | Drafted the Cards, pitch script, and session logs from verified output rather than from templates | First draft of the PR follow-up comment was **far too long** for a follow-up; cut roughly 70% after the human pushed back on length and open-source convention |
| Strategy | Recommended rejecting the transaction-explainer direction and separating the Week 4 repository | — |

### Where AI changed the outcome

- **Caught a demo that would have failed live.** The `swap` script had never worked with its
  default parameters. Without a full run before Day 5, this surfaces in front of judges.
- **Turned a workaround into an upstream question.** The balance problem is a framework gap, not a
  Pendle problem. Framing it that way produced a proposal instead of a local hack.
- **Prevented scope creep twice** — the explainer direction and the impulse to put Week 4's
  product on the fork.

### Where the human overruled the AI

- Rejected the first PR follow-up draft as too long and asked what open-source convention actually
  looks like; the short version replaced it, and then the comment was held back entirely.
- Set the schedule a day earlier than proposed.
- Chose to treat Thursday as Day 3 rather than Day 4, buying buffer without extending the deadline.

## Open decisions

| Question | Owner | Needed by |
| --- | --- | --- |
| Team name | User | Before sharing the Team Card |
| Whether PR #109 merges before the hackathon | Maintainer | Sat — Plan B otherwise |
| Caller ERC-20 state override on `SimulatorOptions` | Upstream maintainer | Not blocking Week 3 |
| Decoding `MarketZeroNetLPFee` in the simulator's REVERTED path | Upstream maintainer | Not blocking Week 3 |
