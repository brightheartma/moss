import {
  type Address,
  type CapabilityNode,
  type Change,
  type MossRuntime,
  transaction,
} from "@themoss/core";
import { ERC20Abi } from "@themoss/erc";
import { createTraceSimulator } from "@themoss/simulator";
import { monadRuntime } from "@themoss/system";
import { encodeFunctionData, getAddress, parseAbiItem } from "viem";
import { beforeAll, describe, expect, it } from "vitest";
import { PENDLE_ROUTER_ADDRESS } from "../src/addresses.js";
import { discoverPendleMarkets } from "../src/market-discovery.js";
import { quotePendleSwap } from "../src/market-quote.js";
import { buildPendleSwapPlan } from "../src/swap-builder.js";
import type { PendleQuote, VerifiedMarket } from "../src/types.js";

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);
// Monad's public RPC caps eth_getLogs at a 100-block range, so holders are found by paging backward.
const LOG_PAGE_BLOCKS = 100n;
const MAX_LOG_PAGES = 400n;

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Pendle swap simulation", () => {
  let runtime: MossRuntime;
  let market: VerifiedMarket;

  beforeAll(async () => {
    runtime = await monadRuntime();
    const result = await discoverPendleMarkets(runtime);
    const first = result.verified[0];
    if (!first) throw new Error("no verified Pendle market available for simulation");
    market = first.market;
  }, 180_000);

  it("simulates buying PT into an ordered, non-reverting Change trace", {
    timeout: 240_000,
  }, async () => {
    const { quote, holder, changes } = await simulateSwap(runtime, market, {
      tokenIn: market.underlying,
      tokenOut: market.pt,
    });
    expect(quote.direction).toBe("buy-pt");
    expect(changes.length).toBeGreaterThan(0);
    logTrace("buy-pt", quote, holder, changes);
  });

  it("simulates selling PT into an ordered, non-reverting Change trace", {
    timeout: 240_000,
  }, async () => {
    const { quote, holder, changes } = await simulateSwap(runtime, market, {
      tokenIn: market.pt,
      tokenOut: market.underlying,
    });
    expect(quote.direction).toBe("sell-pt");
    expect(changes.length).toBeGreaterThan(0);
    logTrace("sell-pt", quote, holder, changes);
  });
});

async function simulateSwap(
  runtime: MossRuntime,
  market: VerifiedMarket,
  tokens: { tokenIn: Address; tokenOut: Address },
): Promise<{ quote: PendleQuote; holder: Address; changes: readonly Change[] }> {
  const decimals = tokens.tokenIn === market.pt ? market.decimals.pt : market.decimals.underlying;
  const amountIn = 10n ** BigInt(decimals);
  // A neutral holder only: the market/SY/PT/YT are swap participants and would self-transfer.
  const exclude = new Set(
    [market.market, market.sy, market.pt, market.yt, market.underlying, PENDLE_ROUTER_ADDRESS].map(
      (address) => address.toLowerCase(),
    ),
  );
  const holder = await findHolder(runtime, tokens.tokenIn, amountIn, exclude);

  const quote = await quotePendleSwap(runtime, market, {
    tokenIn: tokens.tokenIn,
    tokenOut: tokens.tokenOut,
    amountIn,
    slippageBps: 50,
  });
  const plan = buildPendleSwapPlan(quote, holder);

  const approvalTx = transaction(holder, tokens.tokenIn, {
    data: encodeFunctionData({
      abi: ERC20Abi,
      functionName: "approve",
      args: [PENDLE_ROUTER_ADDRESS, amountIn],
    }),
  });
  const root: CapabilityNode = {
    kind: "capability",
    protocol: "pendle",
    method: "swap",
    params: {},
    children: [
      {
        kind: "capability",
        protocol: "erc20",
        method: "approve",
        params: {},
        children: [approvalTx],
      },
      plan.transaction,
    ],
  };

  const outcome = await createTraceSimulator(runtime, {
    // Stage 8 owns the exhaustive parser; this pass-through only lets the simulator
    // finish so we can capture the ordered Changes it produced.
    receipt: (node, changes) => ({
      kind: "receipt",
      protocol: node.protocol,
      outcome: null,
      text: `${node.protocol}.${node.method}`,
      changes: changes.map((change) => ({
        kind: "change",
        change,
        data: null,
        text: change.kind === "event" ? change.address : `${change.from}->${change.to}`,
      })),
    }),
  }).simulate(root);

  expect(outcome.halted).toBeUndefined();
  const swapResult = outcome.results.at(-1);
  expect(swapResult?.reverted).toBe(false);
  expect(swapResult?.warnings).toEqual([]);
  expect(swapResult?.gas).not.toBeNull();
  const changes = swapResult?.changes;
  if (!changes) throw new Error("simulation produced no Changes");
  return { quote, holder, changes };
}

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

function logTrace(
  direction: string,
  quote: PendleQuote,
  holder: Address,
  changes: readonly Change[],
): void {
  console.info(
    `[Pendle ${direction} simulation] ${JSON.stringify({
      holder,
      market: quote.market,
      amountIn: quote.amountIn.toString(),
      expectedOut: quote.expectedOut.toString(),
      minOut: quote.minOut.toString(),
      changeCount: changes.length,
      changes: changes.map((change) =>
        change.kind === "event"
          ? { kind: "event", address: change.address, topic0: change.topics[0] }
          : { kind: "nativeTransfer", from: change.from, to: change.to, value: change.value },
      ),
    })}`,
  );
}
