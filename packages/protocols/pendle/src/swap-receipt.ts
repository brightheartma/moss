import type { Change, ReceiptChange, ReceiptResult } from "@themoss/core";
import { ERC20Abi } from "@themoss/erc";
import { type AbiEvent, decodeEventLog, toEventSelector } from "viem";
import {
  PendleMarketAbi,
  PendleRouterAbi,
  PendleStandardizedYieldAbi,
  PendleYieldTokenAbi,
} from "./abis/pendle.js";
import type { PendleSwapDirection, PendleSwapOutcome } from "./types.js";

export class PendleSwapReceiptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PendleSwapReceiptError";
  }
}

function selector(abi: readonly unknown[], name: string): `0x${string}` {
  const item = (abi as AbiEvent[]).find((entry) => entry.type === "event" && entry.name === name);
  if (!item) throw new Error(`Pendle ABI is missing event ${name}`);
  return toEventSelector(item);
}

const SWAP_PT_AND_TOKEN = selector(PendleRouterAbi, "SwapPtAndToken");

// Every event a v1 simple-route PT swap may emit; anything else is foreign and rejected.
const RECOGNIZED_EVENTS: ReadonlyMap<string, string> = new Map([
  [SWAP_PT_AND_TOKEN, "Router.SwapPtAndToken"],
  [selector(PendleMarketAbi, "Swap"), "Market.Swap"],
  [selector(PendleMarketAbi, "UpdateImpliedRate"), "Market.UpdateImpliedRate"],
  [selector(PendleStandardizedYieldAbi, "Deposit"), "SY.Deposit"],
  [selector(PendleStandardizedYieldAbi, "Redeem"), "SY.Redeem"],
  [selector(PendleYieldTokenAbi, "NewInterestIndex"), "YT.NewInterestIndex"],
  [selector(ERC20Abi, "Transfer"), "ERC20.Transfer"],
  [selector(ERC20Abi, "Approval"), "ERC20.Approval"],
]);

/**
 * Parses a Pendle PT swap trace into a typed outcome, retaining every Change in original order.
 *
 * The outcome comes solely from the single Router `SwapPtAndToken` event; all other events are
 * recognized by signature as expected swap evidence. Any unrecognized event, native transfer, or a
 * missing/duplicate `SwapPtAndToken` is rejected — the parser never infers or skips a Change.
 */
export function parsePendleSwapReceipt(
  changes: readonly Change[],
): ReceiptResult<PendleSwapOutcome> {
  let outcome: PendleSwapOutcome | undefined;
  const leaves: ReceiptChange[] = changes.map((change) => {
    if (change.kind === "nativeTransfer") {
      throw new PendleSwapReceiptError(
        `unexpected native transfer from ${change.from} to ${change.to} in a Pendle PT swap`,
      );
    }
    const topic0 = change.topics[0];
    const name = topic0 ? RECOGNIZED_EVENTS.get(topic0) : undefined;
    if (!name) {
      throw new PendleSwapReceiptError(
        `unexpected event ${topic0 ?? "(anonymous)"} emitted by ${change.address}`,
      );
    }
    if (topic0 === SWAP_PT_AND_TOKEN) {
      if (outcome)
        throw new PendleSwapReceiptError("Pendle swap emitted more than one SwapPtAndToken");
      outcome = toOutcome(change);
      return { kind: "change", change, data: outcome, text: describe(outcome) };
    }
    return {
      kind: "change",
      change,
      data: { event: name, emitter: change.address },
      text: `${name} @ ${change.address}`,
    };
  });

  if (!outcome) {
    throw new PendleSwapReceiptError(
      "Pendle swap Receipt requires exactly one SwapPtAndToken event",
    );
  }
  return { kind: "receipt", outcome, text: describe(outcome), changes: leaves };
}

function toOutcome(change: Extract<Change, { kind: "event" }>): PendleSwapOutcome {
  const decoded = decodeEventLog({
    abi: PendleRouterAbi,
    topics: change.topics as [`0x${string}`, ...`0x${string}`[]],
    data: change.data,
    strict: true,
  });
  if (decoded.eventName !== "SwapPtAndToken") {
    throw new PendleSwapReceiptError(`expected SwapPtAndToken, decoded ${decoded.eventName}`);
  }
  const { market, token, caller, receiver, netPtToAccount, netTokenToAccount } = decoded.args;
  const direction: PendleSwapDirection = netPtToAccount > 0n ? "buy-pt" : "sell-pt";
  const amountIn = (direction === "buy-pt" ? -netTokenToAccount : -netPtToAccount).toString();
  const amountOut = (direction === "buy-pt" ? netPtToAccount : netTokenToAccount).toString();
  return {
    operation: "swap",
    protocol: "pendle",
    direction,
    market,
    token,
    caller,
    receiver,
    amountIn,
    amountOut,
  };
}

function describe(outcome: PendleSwapOutcome): string {
  const [inLabel, outLabel] =
    outcome.direction === "buy-pt" ? [outcome.token, "PT"] : ["PT", outcome.token];
  return `Pendle ${outcome.direction}: ${outcome.amountIn} ${inLabel} -> ${outcome.amountOut} ${outLabel} in market ${outcome.market}`;
}
