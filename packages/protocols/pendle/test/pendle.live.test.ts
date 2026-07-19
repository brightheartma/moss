import { type Address, type MossRuntime, Registry } from "@themoss/core";
import { ERC20Abi } from "@themoss/erc";
import { createTraceSimulator } from "@themoss/simulator";
import { monadRuntime } from "@themoss/system";
import { getAddress, parseAbiItem } from "viem";
import { beforeAll, describe, expect, it } from "vitest";
import { PENDLE_ROUTER_ADDRESS } from "../src/addresses.js";
import { discoverPendleMarkets } from "../src/market-discovery.js";
import { Pendle } from "../src/pendle.js";
import type { PendleSwapOutcome, VerifiedMarket } from "../src/types.js";

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);
// Monad's public RPC caps eth_getLogs at a 100-block range, so holders are found by paging backward.
const LOG_PAGE_BLOCKS = 100n;
const MAX_LOG_PAGES = 400n;

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Pendle protocol on Monad mainnet", () => {
  let runtime: MossRuntime;
  let registry: Registry;
  let market: VerifiedMarket;

  beforeAll(async () => {
    runtime = await monadRuntime();
    registry = new Registry(runtime).use(Pendle);
    const result = await discoverPendleMarkets(runtime);
    const first = result.verified[0];
    if (!first) throw new Error("no verified Pendle market available for simulation");
    market = first.market;
  }, 180_000);

  it("swaps underlying into PT with an exhaustive typed Receipt", {
    timeout: 240_000,
  }, async () => {
    const outcome = await runSwap(market.underlying, market.pt, market.decimals.underlying);
    expect(outcome).toMatchObject({
      operation: "swap",
      protocol: "pendle",
      direction: "buy-pt",
      market: market.market,
      token: market.underlying,
    });
  });

  it("swaps PT back into underlying with an exhaustive typed Receipt", {
    timeout: 240_000,
  }, async () => {
    const outcome = await runSwap(market.pt, market.underlying, market.decimals.pt);
    expect(outcome).toMatchObject({
      operation: "swap",
      protocol: "pendle",
      direction: "sell-pt",
      market: market.market,
      token: market.underlying,
    });
  });

  async function runSwap(
    tokenIn: Address,
    tokenOut: Address,
    decimalsIn: number,
  ): Promise<PendleSwapOutcome> {
    const exclude = new Set(
      [
        market.market,
        market.sy,
        market.pt,
        market.yt,
        market.underlying,
        PENDLE_ROUTER_ADDRESS,
      ].map((address) => address.toLowerCase()),
    );
    const holder = await findHolder(runtime, tokenIn, 10n ** BigInt(decimalsIn), exclude);

    const capability = await registry.action("pendle", "swap", holder, {
      market: market.market,
      tokenIn,
      tokenOut,
      amountIn: "1",
      slippageBps: 50,
    });
    if (capability.kind !== "capability") throw new Error("expected a Capability");

    const result = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(capability);

    expect(result.halted).toBeUndefined();
    const swap = result.results.at(-1);
    expect(swap?.reverted).toBe(false);
    expect(swap?.warnings).toEqual([]);
    expect(swap?.gas).not.toBeNull();
    const outcome = swap?.receipt?.outcome as PendleSwapOutcome;
    expect(outcome.receiver).toBe(holder);
    expect(BigInt(outcome.amountOut)).toBeGreaterThan(0n);
    console.info(`[Pendle ${outcome.direction}] ${JSON.stringify(outcome)}`);
    return outcome;
  }
});

async function findHolder(
  runtime: MossRuntime,
  token: Address,
  minAmount: bigint,
  exclude: ReadonlySet<string>,
): Promise<Address> {
  const seen = new Set<string>();
  let toBlock = await runtime.client.getBlockNumber();
  for (let page = 0n; page < MAX_LOG_PAGES; page++) {
    const fromBlock = toBlock > LOG_PAGE_BLOCKS ? toBlock - LOG_PAGE_BLOCKS + 1n : 0n;
    const logs = await runtime.client.getLogs({
      address: token,
      event: TRANSFER_EVENT,
      fromBlock,
      toBlock,
    });
    for (const log of logs.reverse()) {
      const to = log.args.to;
      if (!to) continue;
      const key = to.toLowerCase();
      if (exclude.has(key) || seen.has(key)) continue;
      seen.add(key);
      if ((await balanceOf(runtime, token, to)) >= minAmount) return getAddress(to);
    }
    if (fromBlock === 0n) break;
    toBlock = fromBlock - 1n;
  }
  throw new Error(`no neutral holder of ${token} with balance >= ${minAmount} found`);
}

function balanceOf(runtime: MossRuntime, token: Address, owner: Address): Promise<bigint> {
  return runtime.client.readContract({
    address: token,
    abi: ERC20Abi,
    functionName: "balanceOf",
    args: [owner],
  }) as Promise<bigint>;
}
