import { type Change, verifyReceiptCoverage } from "@themoss/core";
import {
  type AbiEvent,
  type Address,
  encodeAbiParameters,
  encodeEventTopics,
  getAddress,
  toEventSelector,
} from "viem";
import { describe, expect, it } from "vitest";
import {
  PendleMarketAbi,
  PendleRouterAbi,
  PendleStandardizedYieldAbi,
  PendleYieldTokenAbi,
} from "../src/abis/pendle.js";
import { PendleSwapReceiptError, parsePendleSwapReceipt } from "../src/swap-receipt.js";

const MARKET = getAddress("0x1111111111111111111111111111111111111111");
const SY = getAddress("0x2222222222222222222222222222222222222222");
const PT = getAddress("0x3333333333333333333333333333333333333333");
const YT = getAddress("0x4444444444444444444444444444444444444444");
const UNDERLYING = getAddress("0x5555555555555555555555555555555555555555");
const CALLER = getAddress("0x7777777777777777777777777777777777777777");
const RECEIVER = getAddress("0x8888888888888888888888888888888888888888");

const TRANSFER = "event Transfer(address indexed from, address indexed to, uint256 value)";
const APPROVAL = "event Approval(address indexed owner, address indexed spender, uint256 value)";

function selector(abi: readonly unknown[], name: string): `0x${string}` {
  const item = (abi as AbiEvent[]).find((entry) => entry.type === "event" && entry.name === name);
  if (!item) throw new Error(`missing event ${name}`);
  return toEventSelector(item);
}

function event(emitter: Address, topic0: `0x${string}`): Change {
  return Object.freeze({
    kind: "event",
    address: emitter,
    topics: Object.freeze([topic0]),
    data: "0x",
  });
}

function swapPtAndToken(netPtToAccount: bigint, netTokenToAccount: bigint): Change {
  const topics = encodeEventTopics({
    abi: PendleRouterAbi,
    eventName: "SwapPtAndToken",
    args: { caller: CALLER, market: MARKET, token: UNDERLYING },
  });
  const data = encodeAbiParameters(
    [
      { name: "receiver", type: "address" },
      { name: "netPtToAccount", type: "int256" },
      { name: "netTokenToAccount", type: "int256" },
      { name: "netSyInterm", type: "uint256" },
    ],
    [RECEIVER, netPtToAccount, netTokenToAccount, 12_345n],
  );
  return Object.freeze({
    kind: "event",
    address: getAddress("0x9999999999999999999999999999999999999999"),
    topics: Object.freeze(topics as `0x${string}`[]),
    data,
  });
}

const marketSwap = () => event(MARKET, selector(PendleMarketAbi, "Swap"));
const marketRate = () => event(MARKET, selector(PendleMarketAbi, "UpdateImpliedRate"));
const syDeposit = () => event(SY, selector(PendleStandardizedYieldAbi, "Deposit"));
const syRedeem = () => event(SY, selector(PendleStandardizedYieldAbi, "Redeem"));
const ytIndex = () => event(YT, selector(PendleYieldTokenAbi, "NewInterestIndex"));
const transfer = (emitter: Address) => event(emitter, toEventSelector(TRANSFER));
const approval = (emitter: Address) => event(emitter, toEventSelector(APPROVAL));

function buySequence(): Change[] {
  return [
    transfer(UNDERLYING),
    transfer(UNDERLYING),
    transfer(SY),
    syDeposit(),
    ytIndex(),
    ytIndex(),
    transfer(PT),
    transfer(SY),
    marketRate(),
    marketSwap(),
    swapPtAndToken(1_009_082n, -1_000_000n),
  ];
}

function sellSequence(): Change[] {
  return [
    approval(PT),
    transfer(PT),
    ytIndex(),
    transfer(SY),
    transfer(SY),
    marketRate(),
    marketSwap(),
    transfer(SY),
    transfer(UNDERLYING),
    syRedeem(),
    swapPtAndToken(-1_000_000n, 990_561n),
  ];
}

describe("Pendle swap Receipt parser", () => {
  it("parses a full buy-PT trace into a typed outcome covering every Change in order", () => {
    const changes = buySequence();
    const receipt = parsePendleSwapReceipt(changes);

    expect(receipt.outcome).toEqual({
      operation: "swap",
      protocol: "pendle",
      direction: "buy-pt",
      market: MARKET,
      token: UNDERLYING,
      caller: CALLER,
      receiver: RECEIVER,
      amountIn: "1000000",
      amountOut: "1009082",
    });
    expect(receipt.changes).toHaveLength(changes.length);
    receipt.changes.forEach((leaf, index) => {
      expect(leaf).toMatchObject({ kind: "change", change: changes[index] });
    });
    expect(() => verifyReceiptCoverage(changes, receipt)).not.toThrow();
  });

  it("parses a full sell-PT trace into a typed outcome", () => {
    const changes = sellSequence();
    const receipt = parsePendleSwapReceipt(changes);

    expect(receipt.outcome).toMatchObject({
      direction: "sell-pt",
      amountIn: "1000000",
      amountOut: "990561",
      token: UNDERLYING,
    });
    expect(() => verifyReceiptCoverage(changes, receipt)).not.toThrow();
  });

  it("rejects a trace without the Router SwapPtAndToken event", () => {
    const changes = buySequence().slice(0, -1);
    expect(() => parsePendleSwapReceipt(changes)).toThrow(PendleSwapReceiptError);
  });

  it("rejects a trace with more than one SwapPtAndToken event", () => {
    const changes = [...buySequence(), swapPtAndToken(1n, -1n)];
    expect(() => parsePendleSwapReceipt(changes)).toThrow(/one SwapPtAndToken/);
  });

  it("rejects an unrecognized event", () => {
    const foreign = event(MARKET, `0x${"ab".repeat(32)}`);
    expect(() => parsePendleSwapReceipt([foreign, swapPtAndToken(1n, -1n)])).toThrow(
      PendleSwapReceiptError,
    );
  });

  it("rejects an unexpected native transfer", () => {
    const native: Change = Object.freeze({
      kind: "nativeTransfer",
      from: CALLER,
      to: RECEIVER,
      value: "1",
    });
    expect(() => parsePendleSwapReceipt([native, swapPtAndToken(1n, -1n)])).toThrow(
      PendleSwapReceiptError,
    );
  });
});
