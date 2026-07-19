import {
  type ActionCtx,
  Address,
  type AddressValue,
  BasisPoints,
  Capability,
  type CapabilityResult,
  type Change,
  type InferParams,
  type MossRuntime,
  ParameterError,
  type ParamsSpec,
  PositiveDecimalString,
  Protocol,
  type ProtocolRef,
  Receipt,
  type ReceiptResult,
} from "@themoss/core";
import { ERC20 } from "@themoss/erc";
import { getAddress, parseUnits } from "viem";
import { PendleMarketAbi } from "./abis/pendle.js";
import { PENDLE_ROUTER_ADDRESS } from "./addresses.js";
import { quotePendleSwap } from "./market-quote.js";
import { verifyPendleMarket } from "./market-verifier.js";
import { buildPendleSwapPlan } from "./swap-builder.js";
import { parsePendleSwapReceipt } from "./swap-receipt.js";
import type { PendleSwapOutcome, VerifiedMarket } from "./types.js";

const swapParams = {
  market: {
    type: Address,
    description: "Pendle market to trade against; re-verified on-chain before use.",
  },
  tokenIn: {
    type: Address,
    description: "Token spent: the market underlying to buy PT, or the PT to sell.",
  },
  tokenOut: {
    type: Address,
    description: "Token received: the PT when buying, or the underlying when selling.",
  },
  amountIn: {
    type: PositiveDecimalString,
    description: "Amount of tokenIn to swap, in its display units.",
  },
  slippageBps: {
    type: BasisPoints,
    description: "Maximum slippage tolerated; bounds the minimum output accepted.",
  },
} satisfies ParamsSpec;

type PendleSwapParams = InferParams<typeof swapParams>;

@Protocol({
  name: "pendle",
  category: "dex",
  description:
    "Pendle PT swaps against a market underlying over dynamically verified Monad markets.",
  contracts: {},
  protocols: { erc20: ERC20 },
})
export class Pendle {
  declare runtime: MossRuntime;
  declare erc20: ProtocolRef<ERC20>;

  @Capability<Pendle, typeof swapParams>({
    intent: "Swap a market underlying and its Pendle PT in either direction",
    verb: "swap",
    params: swapParams,
    receipt: "swapReceipt",
    risk: ["fundOut", "approval", "priceImpact"],
    tags: ["yield", "pt"],
  })
  async swap(params: PendleSwapParams, ctx: ActionCtx): Promise<CapabilityResult> {
    const market = await this.#verifyForSwap(params.market, params.tokenIn, params.tokenOut);
    const decimalsIn =
      getAddress(params.tokenIn) === market.pt ? market.decimals.pt : market.decimals.underlying;
    const amountIn = parseUnits(params.amountIn, decimalsIn);
    const quote = await quotePendleSwap(this.runtime, market, {
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn,
      slippageBps: params.slippageBps,
    });
    const plan = buildPendleSwapPlan(quote, ctx.account);
    return [
      await this.erc20.approve({
        token: quote.tokenIn,
        spender: PENDLE_ROUTER_ADDRESS,
        amount: quote.amountIn.toString(),
      }),
      plan.transaction,
    ];
  }

  @Receipt()
  swapReceipt(changes: readonly Change[]): ReceiptResult<PendleSwapOutcome> {
    return parsePendleSwapReceipt(changes);
  }

  /**
   * Re-verifies a caller-supplied market on-chain and pins which side is the underlying, requiring
   * exactly one of tokenIn/tokenOut to be the market's PT.
   */
  async #verifyForSwap(market: string, tokenIn: string, tokenOut: string): Promise<VerifiedMarket> {
    const tokens = await this.runtime.client.readContract({
      address: getAddress(market),
      abi: PendleMarketAbi,
      functionName: "readTokens",
    });
    const pt = getAddress(tokens[1]);
    const inAddr = getAddress(tokenIn);
    const outAddr = getAddress(tokenOut);
    const underlying: AddressValue | undefined =
      inAddr === pt ? outAddr : outAddr === pt ? inAddr : undefined;
    if (!underlying) {
      throw new ParameterError(`neither tokenIn nor tokenOut is the market PT ${pt}`);
    }
    return verifyPendleMarket(this.runtime, { market, expectedUnderlying: underlying });
  }
}
