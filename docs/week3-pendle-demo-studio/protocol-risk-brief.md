# Protocol & Risk Brief — Pendle PT swaps on Monad

> Day 3 Research deliverable. Adapt for your team's user persona and test findings.

## Protocol summary

| Field | Detail |
| --- | --- |
| Protocol | [Pendle](https://pendle.finance) V6 on Monad mainnet (chain ID `143`) |
| Moss package | `@themoss/protocol-pendle` |
| What we demo | Buy Principal Token (PT) with the market underlying |
| Discovery | Pendle official API nominates candidates; Moss re-verifies on-chain |
| Execution | Pendle Router V4 via one direct swap route per market |

## What Pendle is (background for Q&A prep)

Pendle is a yield-splitting protocol and interest-rate market. A normal yield-bearing asset binds
principal and future yield together; Pendle separates them so each can be traded on its own.

- **SY** — wraps a yield-bearing asset (e.g. stETH) into Pendle's unified format.
- **PT (Principal Token)** — the principal redeemable at maturity. Bought at a discount, redeemed
  at full face value; the gap is a locked-in fixed yield. **This is what the demo buys.**
- **YT (Yield Token)** — the yield accrued up to maturity. A bet on the yield rate rising; goes to
  zero at maturity.
- **AMM** — the market for PT and YT, priced along a curve tuned to yield and time-to-maturity.

Example: a 1-year PT-stETH at 0.95 ETH redeems for ~1 ETH at maturity — hold to maturity and you
have locked in ~5%. Someone betting staking yields will climb buys YT instead to amplify that bet.

Common uses: buy PT for fixed yield; buy YT to bet on yield/points; sell YT to realize future
yield now; provide liquidity for underlying yield + fees + incentives; hedge falling staking,
lending, or funding rates.

The point is that Pendle turns interest itself into a tradable asset — like stripping a bond into
principal and coupon. PT is a fixed-income instrument; YT is a high-volatility yield derivative.

Extra risks this framing surfaces, beyond the ones tabled below: smart-contract and upstream-protocol
risk, underlying de-peg, YT decaying to zero at maturity, mispricing the expected rate, and thin
liquidity / slippage on niche markets. **We only demo buy-PT, the fixed-income side.**

Source: internal Pendle research notebook (NotebookLM).

## Capabilities and queries

| Moss method | Kind | Purpose |
| --- | --- | --- |
| `markets` | Query | List verified markets, expiry, decimals, inferred APY |
| `quote` | Query | Expected and minimum output for a buy-PT or sell-PT swap |
| `swap` | Capability | Build approve + Router transaction tree; parse typed receipt |

## Inputs and outputs (buy-PT path)

| Parameter | Role |
| --- | --- |
| `market` | Pendle market address; re-verified every call |
| `tokenIn` | Market underlying |
| `tokenOut` | Market PT |
| `amountIn` | Human-readable underlying amount |
| `slippageBps` | Minimum output bound (basis points) |

| Output | Meaning |
| --- | --- |
| Quote `estimatedOut` / `minOut` | Expected and protected PT amounts |
| Swap receipt `buy-pt` outcome | Parsed direction, amounts, market, parties |
| Simulation warnings | Must halt demo; do not sign |

## Preconditions

- Monad mainnet RPC reachable; Moss Runtime verifies chain ID `143`.
- Caller supplies a valid `market` that passes factory, `readTokens`, SY support, and bytecode checks.
- `tokenIn` / `tokenOut` must include exactly one PT side and the matching underlying.
- Account must already hold enough underlying for simulation to succeed. The simulator prefunds native
  balance only, so a placeholder address reverts the Router call; the example defaults to a read-only
  holder and checks the balance before building anything.

## Failure modes

| Failure | User-visible signal | Agent behavior |
| --- | --- | --- |
| No verified markets | `markets` empty or error | Explain discovery unavailable; do not invent a market |
| Invalid market address | `ParameterError` | Ask user to pick from verified list |
| Slippage too tight | Quote rejected | Suggest higher `slippageBps` or smaller size |
| Simulation warning / revert | Moss halts | Show warning; do not proceed to wallet |
| Expired or illiquid market | Poor quote or revert | Research flags market; Ops explains expiry risk |

## Risk labels (Moss metadata)

`swap` carries:

- **fundOut** — underlying leaves the user account.
- **approval** — ERC-20 approval to Pendle Router may be nested in the Capability tree.
- **priceImpact** — PT pricing is AMM-like; size and liquidity matter.

## Not suitable for automatic execution

- Any `swap` without showing quote + simulation receipts.
- Trading size above team-agreed demo cap without explicit confirmation.
- Markets the user did not select from verified `markets` output.
- Treating API `aggregatedApy` as guaranteed yield — provenance is `inferred`, not on-chain.

## APY and metadata provenance

`markets` may include `aggregatedApy` from the Pendle official API with `inferred` provenance. This is
**not** a Moss-verified on-chain rate. Demo copy must say "indicative APY from Pendle API".

## Moss trust boundary

Registered Protocol code is trusted after review and tests. Moss verifies simulation evidence but does
not audit Pendle contracts. Users still confirm every unsigned transaction in their wallet.

## Demo risk script (for Ops)

Suggested user-facing lines:

1. "I'll show you the market and quote before building anything."
2. "This is a simulated swap — nothing moves until you approve in your wallet."
3. "APY is informational from Pendle's API, not a promise."
4. "If simulation warns or fails, we stop."

## Open questions

| Question | Owner | Resolution |
| --- | --- | --- |
| How should a caller fund the input token for simulation? | Dev | Open upstream: a caller ERC-20 state override on `SimulatorOptions`. Until then the example depends on a third-party wallet's balance |
| Should a dust swap fail early instead of at simulation? | Dev | Open upstream: measured that RouterStatic quotes every amount without reverting, so only execution surfaces `MarketZeroNetLPFee`. Proposal is to decode the selector in the simulator's REVERTED path |
| How should an inferred APY of ~644% be presented? | Research | Show it with the `inferred` label and say plainly it is API data, not an on-chain guarantee. Never let a headline APY drive execution |
| What happens if the demo holder's balance moves before Day 5? | Dev | The balance assertion names the shortfall and points at `MOSS_ACCOUNT`; pick a fresh holder from `markets` output if it fires |
