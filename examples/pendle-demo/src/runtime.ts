/** Shared Registry and simulator wiring for the Pendle Week 3 demo examples. */
import { type CapabilityNode, type QueryResult, Registry } from "@themoss/core";
import * as erc from "@themoss/erc";
import type { PendleMarketView, PendleQuoteView } from "@themoss/protocol-pendle";
import * as pendle from "@themoss/protocol-pendle";
import { createTraceSimulator } from "@themoss/simulator";
import * as system from "@themoss/system";
import { monadRuntime } from "@themoss/system";
import { formatUnits, parseUnits } from "viem";

// Simulation needs a sender that actually holds the market underlying: the trace simulator
// prefunds native balance only, so a placeholder address makes every swap revert. This is a
// read-only EOA holding the USDat underlying; override it with MOSS_ACCOUNT when it runs dry.
export const ACCOUNT = (process.env.MOSS_ACCOUNT ??
  "0x288dA54Fb62bb25FA694D8B4d54710B0A630bede") as `0x${string}`;

export const runtime = await monadRuntime({
  ...(process.env.MOSS_RPC_URL ? { rpcUrl: process.env.MOSS_RPC_URL } : {}),
});

export const registry = new Registry(runtime).use(system, erc, pendle);

export const simulator = createTraceSimulator(runtime, {
  receipt: (capability, changes) => registry.parseReceipt(capability, changes),
});

export function expectQuery(result: QueryResult | CapabilityNode): QueryResult {
  if (result.kind !== "query") throw new Error("expected a Query result");
  return result;
}

export function expectCapability(result: QueryResult | CapabilityNode): CapabilityNode {
  if (result.kind !== "capability") throw new Error("expected a Capability");
  return result;
}

export function readMarkets(result: QueryResult | CapabilityNode): readonly PendleMarketView[] {
  const query = expectQuery(result);
  return query.data as readonly PendleMarketView[];
}

export function readQuote(result: QueryResult | CapabilityNode): PendleQuoteView {
  const query = expectQuery(result);
  return query.data as PendleQuoteView;
}

/**
 * Fail with a readable message instead of an opaque `execution reverted` when the demo sender no
 * longer holds enough underlying. The default ACCOUNT is a third-party wallet, so its balance can
 * change at any time.
 */
export async function assertBalance(
  token: `0x${string}`,
  owner: `0x${string}`,
  amount: string,
): Promise<void> {
  const query = expectQuery(await registry.action("erc20", "balanceOf", owner, { token, owner }));
  const { symbol, decimals, balance } = query.data as {
    symbol: string;
    decimals: number;
    balance: string;
  };
  const required = parseUnits(amount, decimals);
  if (BigInt(balance) >= required) return;
  throw new Error(
    `demo sender ${owner} holds ${formatUnits(BigInt(balance), decimals)} ${symbol} but the swap ` +
      `needs ${amount}. Set MOSS_ACCOUNT to an address holding ${symbol}, or lower ` +
      `MOSS_SWAP_AMOUNT.`,
  );
}

export function firstMarket(markets: readonly PendleMarketView[]): PendleMarketView {
  const market = markets[0];
  if (!market) throw new Error("no verified Pendle market available");
  return market;
}
