/**
 * Week 3 PT Yield Assistant core flow:
 * markets → quote → swap capability → simulate → receipt (no signing).
 */
import {
  ACCOUNT,
  assertBalance,
  expectCapability,
  firstMarket,
  readMarkets,
  readQuote,
  registry,
  simulator,
} from "./runtime.js";

const SWAP_AMOUNT = process.env.MOSS_SWAP_AMOUNT ?? "0.01";
const SLIPPAGE_BPS = Number(process.env.MOSS_SLIPPAGE_BPS ?? "50");

const market = firstMarket(readMarkets(await registry.action("pendle", "markets", ACCOUNT, {})));

console.log("step 1: markets");
console.log({
  selected: market.name,
  market: market.market,
  underlying: market.underlying,
  pt: market.pt,
  expiryUtc: market.expiryUtc,
  aggregatedApy: market.aggregatedApy,
  apyProvenance: market.apyProvenance.kind,
});

await assertBalance(market.underlying, ACCOUNT, SWAP_AMOUNT);

const quote = readQuote(
  await registry.action("pendle", "quote", ACCOUNT, {
    market: market.market,
    tokenIn: market.underlying,
    tokenOut: market.pt,
    amountIn: SWAP_AMOUNT,
    slippageBps: SLIPPAGE_BPS,
  }),
);

console.log("step 2: quote");
console.log(quote);

const capability = expectCapability(
  await registry.action("pendle", "swap", ACCOUNT, {
    market: market.market,
    tokenIn: market.underlying,
    tokenOut: market.pt,
    amountIn: SWAP_AMOUNT,
    slippageBps: SLIPPAGE_BPS,
  }),
);

console.log("step 3: swap capability tree");
console.log(capability);

const outcome = await simulator.simulate(capability);
console.log("step 4: simulation");
console.log(JSON.stringify(outcome, null, 2));

if (outcome.halted || outcome.results.some(({ warnings }) => warnings.length > 0)) {
  console.error("Warnings present. Stop; do not sign.");
  process.exitCode = 1;
} else {
  for (const result of outcome.results) {
    if (result.receipt?.text) console.log(result.receipt.text);
  }
  console.log(
    "Compare every Receipt with the requested buy-PT swap before signing. Moss does not sign or send.",
  );
}
