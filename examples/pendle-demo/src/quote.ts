/** Quote a buy-PT swap on the first verified Pendle market. */
import { ACCOUNT, firstMarket, readMarkets, readQuote, registry } from "./runtime.js";

const SWAP_AMOUNT = process.env.MOSS_SWAP_AMOUNT ?? "0.01";
const SLIPPAGE_BPS = Number(process.env.MOSS_SLIPPAGE_BPS ?? "50");

const market = firstMarket(readMarkets(await registry.action("pendle", "markets", ACCOUNT, {})));

console.log("selected market", {
  name: market.name,
  market: market.market,
  underlying: market.underlying,
  pt: market.pt,
});

const quote = readQuote(
  await registry.action("pendle", "quote", ACCOUNT, {
    market: market.market,
    tokenIn: market.underlying,
    tokenOut: market.pt,
    amountIn: SWAP_AMOUNT,
    slippageBps: SLIPPAGE_BPS,
  }),
);

console.log("buy-pt quote", quote);
console.log(
  `Spend ${quote.amountIn} underlying for ~${quote.estimatedOut} PT (min ${quote.minOut} at ${SLIPPAGE_BPS} bps slippage).`,
);
