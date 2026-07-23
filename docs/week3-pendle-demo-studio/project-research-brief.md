# Project Research Brief — PT Yield Assistant

> Week 3 Research deliverable. Evidence reviewed on 2026-07-23.
>
> Status: research draft complete. Public sources and local mainnet evidence are cited; the three
> scheduled user tests have not happened yet. The human submitter must open the key sources and
> verify the conclusions before submission.

## Executive summary

PT Yield Assistant addresses two connected problems: Pendle fixed-yield products require users to
understand markets, maturity, PT, underlying assets, implied yield, and slippage; after choosing a
trade, users still have to approve transaction data whose consequences may not be clear. The problem
is supported by Ethereum Foundation research on blind signing, Pendle's own product documentation,
the existence of wallet-level transaction simulators, and active Pendle usage.

The opportunity is not to replace Pendle App or a wallet. It is to test a narrower proposition:
whether an Agent can use Moss to discover a verified Pendle market, quote one buy-PT action, simulate
the unsigned transaction tree, and present ordered protocol-specific evidence before a human decides
whether to sign.

## Target user and problem

### Target user

A Monad DeFi user who wants fixed-yield exposure through Pendle PT but:

- does not know which market, maturity, or underlying asset to choose;
- cannot confidently interpret a quote, APY provenance, approval, or swap calldata;
- wants a readable pre-sign explanation without giving an Agent custody or signing authority.

### User problem

The user must cross two comprehension gaps in one journey:

1. **Product selection:** understand PT, accounting asset, maturity, implied APY, market liquidity,
   and slippage well enough to choose a trade.
2. **Execution trust:** understand what the approval and swap will do before authorizing an
   irreversible transaction.

## Problem evidence

### Evidence 1 — Blind signing is an ecosystem-level security problem

The Ethereum Foundation's Trillion Dollar Security report says users routinely approve
transactions without understanding them, and that wallets often show raw hexadecimal data,
truncated addresses, or insufficient information about consequences. It identifies exposure to
malicious contracts, phishing, compromised interfaces, and basic user error. In May 2026, the
Foundation also announced a Clear Signing effort intended to make human-readable confirmations a
default.

**Why it matters here:** a Pendle swap can include an ERC-20 approval plus a Router call. A readable
Receipt and explicit warnings directly address the final pre-sign decision.

Sources:

- [Ethereum Foundation — Trillion Dollar Security: Security Challenges Overview](https://ethereum.org/en/reports/trillion-dollar-security/)
- [Ethereum Foundation — Clear Signing announcement](https://blog.ethereum.org/2026/05/12/clear-signing-announcement)

### Evidence 2 — Pendle's fixed-yield choice has real conceptual load

Pendle's official documentation distinguishes PT, YT, SY, accounting asset, maturity, Underlying
APY, Implied APY, and Fixed APY. It explains that one asset may have several maturities with
independent markets and yields. Buying PT therefore requires more than choosing a headline APY: the
user also needs the correct market, expiry, underlying/accounting asset, size, and exit or redemption
assumptions.

**Why it matters here:** the Assistant should reduce the first decision to one verified market, one
underlying amount, one quote, and one clearly bounded buy-PT action. It must not imply that APY alone
is sufficient evidence.

Sources:

- [Pendle Docs — Using Pendle](https://docs.pendle.finance/pendle-v2/AppGuide/UsingPendle)
- [Pendle Docs — Glossary](https://docs.pendle.finance/pendle-v2/ProtocolMechanics/Glossary)
- [Week 2 Product Research Question Card — Pendle](https://app.notion.com/p/3a1c278534e581fea725ef0dd93d4dfa)

### Evidence 3 — Existing wallets invest in pre-sign simulation

MetaMask provides estimated balance changes so users can better understand the outcome of a
transaction before submitting it. Rabby describes transaction simulation that shows outgoing and
incoming transfers, approvals, balance changes, and contract interactions before confirmation.

**Why it matters here:** two established wallet products independently implementing this pattern is
market evidence that pre-sign comprehension is valuable. It also sets the baseline: PT Yield
Assistant must add protocol-specific market discovery, quoting, risk metadata, and Agent-callable
workflow rather than merely copy a generic balance preview.

Sources:

- [MetaMask — Estimated balance changes](https://support.metamask.io/manage-crypto/transactions/simulations)
- [Rabby — Security and transaction simulation](https://www.rabby.is/en/security.html)

### Evidence 4 — The underlying protocol has active usage

DefiLlama showed approximately **$1.175B total Pendle TVL**, including approximately **$121.59M on
Monad**, when checked on 2026-07-23. It also showed approximately **$408.5M of 30-day Pendle DEX
volume**, including approximately **$55.98M on Monad**. These are dynamic aggregator values and must
not be treated as permanent facts or as user counts.

The local verified run on the same date found four Monad markets and obtained a live quote for the
selected buy-PT path.

**Why it matters here:** this is not a hypothetical protocol integration. There is active capital,
volume, and live market state, although the exact demand for an Agent-assisted interface remains
unproven.

Sources:

- [DefiLlama — Pendle](https://defillama.com/protocol/pendle)
- [Runnable Example](https://app.notion.com/p/3a5c278534e581d79c3fc4fdde42f15a)

## Similar products and current alternatives

| Product / method | What users can do today | Gap relative to this experiment |
| --- | --- | --- |
| [Pendle App](https://app.pendle.finance/trade/markets) | Browse Pendle markets and trade PT/YT through a human-facing interface | It is the primary direct solution and should not be replaced. The demo tests an Agent-callable, one-action path with Moss risk metadata and ordered Receipts |
| [Rabby](https://www.rabby.is/en/security.html) / [MetaMask simulation](https://support.metamask.io/manage-crypto/transactions/simulations) | Preview balance changes, approvals, transfers, or security signals before signing | Generic wallet-level protection starts after a dApp or Agent has formed the transaction; it does not choose a verified Pendle market or produce a protocol-specific quote and Receipt flow |

### Other current methods

- Users manually read Pendle docs, compare markets in Pendle App, then rely on the wallet
  confirmation screen.
- More technical users inspect calldata, contract addresses, block explorers, or simulation tools.
- Users may avoid the trade entirely when the transaction or yield assumptions are unclear.

## Key project risks

| Risk | Evidence / impact | Mitigation |
| --- | --- | --- |
| **Desirability is not yet validated** | Three testers are scheduled, but no interview or comprehension result is recorded | Run the prepared sessions; preserve users' exact words; do not claim adoption from protocol TVL |
| **Competitive overlap** | Pendle already solves direct trading; wallets already simulate transactions | Position the demo as Agent-callable protocol orchestration plus protocol-specific evidence, not as a new wallet or Pendle replacement |
| **APY can mislead** | Pendle APY fields have different meanings; the demo API value is marked `inferred` | Label source and provenance, show expiry and quote, and never let APY trigger automatic execution |
| **Protocol and market risk remain** | PT depends on the underlying asset/protocol, market liquidity, expiry, slippage, and correct redemption assumptions | Keep the Risk Brief visible; show `fundOut`, `approval`, and `priceImpact`; require human confirmation |
| **Simulation is not execution** | State can change after simulation; final transaction outcome is not guaranteed | Present simulation as evidence, not a guarantee; re-quote and re-simulate after parameter changes |
| **Demo depends on an ERC-20 holder** | Moss prefunds native balance only, so an unfunded caller cannot simulate an ERC-20-in swap | Keep the balance precheck and readable failure; pursue caller ERC-20 state override upstream |
| **Upstream status** | Pendle Adapter PR #109 was verified Open, non-draft, and unmerged on 2026-07-23 | State that the demo runs from the fork; use the fork as a Week 4 dependency if necessary |

## What remains a hypothesis

The main unverified question is:

> **After seeing a quote, protocol risk labels, and an ordered Receipt, can a target user correctly
> explain what will happen and make a more confident continue/stop decision than from a normal
> wallet confirmation alone?**

Supporting hypotheses still requiring evidence:

- users naturally ask for "fixed yield" in language the Agent can map to buy-PT;
- protocol-specific Receipt text is clearer than a generic token balance preview;
- users value a natural-language Agent entry point more than improvements inside Pendle App or their
  wallet;
- users understand that "simulated successfully" does not mean "guaranteed to execute."

## Recommendations

### Priority 1 — Run the three comprehension tests before expanding the product

Use the prepared Ops script. Capture the user's unprompted wording first, then test whether they can
identify amount in, expected/minimum PT out, whether funds have moved, and what a failure means.
Change the pitch and future UI vocabulary based on observed hesitation, not assumptions.

### Priority 2 — Keep Week 3 on one real, evidence-rich flow

Do not add YT, LP, selling PT, routing, wallet broadcast, or a new UI. Freeze the verified
`markets → quote → confirm → swap → simulate → Receipt` path, record it, and show both success and
the readable unfunded-account stop.

### Priority 3 — Differentiate Week 4 around decision quality, not automation

Prototype a trade desk that compares:

- market, expiry, APY provenance, and quote;
- protocol risk labels before building;
- ordered asset/approval outcomes after simulation;
- an explicit human confirmation boundary.

Measure whether this improves understanding relative to Pendle App plus an existing wallet
simulator. Do not make faster execution the headline.

## Conclusion

The brief can be completed from current evidence: the user problem is documented by ecosystem
research, adjacent products have already invested in transaction previews, Pendle has active usage,
and the technical flow is real and verified. What cannot yet be claimed is that target users prefer
this Agent-assisted experience or understand it better. That claim requires the three scheduled
tests and should remain an open hypothesis until their raw feedback is recorded.

## Human verification checklist

Before submitting:

- [ ] Open the Ethereum Foundation report and confirm the blind-signing conclusion.
- [ ] Open Pendle's Using Pendle and Glossary pages; confirm PT, maturity, and APY wording.
- [ ] Open MetaMask and Rabby pages; confirm the described simulation scope.
- [ ] Recheck DefiLlama values and retain the 2026-07-23 timestamp if numbers have changed.
- [x] Confirmed PR #109 was Open, non-draft, and unmerged on 2026-07-23.
- [ ] Confirm that no sentence presents protocol TVL as user count or simulation as a guarantee.

## Internal project sources

- [Team Card](https://app.notion.com/p/3a5c278534e581ad84bec74dc42aa968)
- [Use Case & Scope](https://app.notion.com/p/3a5c278534e581e1a258d72850ad0a0f)
- [Protocol & Risk Brief](https://app.notion.com/p/3a5c278534e58195b101f3357fe23017)
- [Week 2 Product Research Question Card — Pendle](https://app.notion.com/p/3a1c278534e581fea725ef0dd93d4dfa)
- [Runnable Example](https://app.notion.com/p/3a5c278534e581d79c3fc4fdde42f15a)
- [Pendle Adapter PR #109](https://github.com/nishuzumi/moss/pull/109)
