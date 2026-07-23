/** List on-chain-verified Pendle markets on Monad mainnet. */
import { ACCOUNT, firstMarket, readMarkets, registry } from "./runtime.js";

const markets = readMarkets(await registry.action("pendle", "markets", ACCOUNT, {}));

console.log(`verified markets: ${markets.length}`);
for (const market of markets) {
  const apy =
    market.aggregatedApy === null
      ? "n/a"
      : `${(market.aggregatedApy * 100).toFixed(2)}% (${market.apyProvenance.kind})`;
  console.log(
    [
      market.name,
      `market=${market.market}`,
      `underlying=${market.underlying}`,
      `pt=${market.pt}`,
      `expiry=${market.expiryUtc}`,
      `apy=${apy}`,
    ].join(" | "),
  );
}

// Sanity check that discovery returns at least one usable market for the other scripts.
firstMarket(markets);
