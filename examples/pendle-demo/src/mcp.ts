/**
 * Week 3 PT Yield Assistant, driven the way an Agent drives it: over MCP.
 *
 * The CLI examples call the Registry in-process, which proves Moss reaches Pendle but not that an
 * Agent can. This one speaks the MCP protocol to the built server over stdio and walks the same
 * flow through the four tools: discover -> load -> action -> simulate.
 */
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { PendleMarketView, PendleQuoteView } from "@themoss/protocol-pendle";

const ACCOUNT = process.env.MOSS_ACCOUNT ?? "0x288dA54Fb62bb25FA694D8B4d54710B0A630bede";
const SWAP_AMOUNT = process.env.MOSS_SWAP_AMOUNT ?? "0.01";
const SLIPPAGE_BPS = Number(process.env.MOSS_SLIPPAGE_BPS ?? "50");

const SERVER_ENTRY = fileURLToPath(
  new URL("../../../packages/mcp-server/dist/cli.js", import.meta.url),
);

/** One discovered operation as `discover` reports it. */
type DiscoveredOperation = {
  protocol: string;
  method: string;
  kind: "capability" | "query";
  summary: string;
};

/** One loaded contract as `load` reports it; `risk` is absent for Queries. */
type LoadedOperation = {
  protocol: string;
  method: string;
  intent: string;
  risk?: readonly string[];
};

/** A Query answer as `action` wraps it. */
type QueryEnvelope<T> = { kind: "query"; data: T };

/** A Capability tree as `action` returns it, opaque here beyond what we print. */
type CapabilityEnvelope = {
  kind: "capability";
  protocol: string;
  method: string;
  children: readonly unknown[];
};

/** The reduced simulation view MCP hands an Agent; full evidence stays in the SDK. */
type AgentSimulation = {
  ok: boolean;
  guidance: string;
  halted?: { transactionIndex: number; reason: string };
  results: readonly {
    protocol: string;
    method: string;
    texts: readonly string[];
    warnings: readonly { code: string; message: string }[];
  }[];
};

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [SERVER_ENTRY],
  env: {
    ...(process.env as Record<string, string>),
    ...(process.env.MOSS_RPC_URL ? { MOSS_RPC_URL: process.env.MOSS_RPC_URL } : {}),
  },
});

const client = new Client({ name: "pendle-demo-mcp", version: "1.0.0" });
await client.connect(transport);

/** Calls one Moss tool and parses its JSON payload, surfacing tool errors as thrown errors. */
async function call<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const result = await client.callTool({ name, arguments: args });
  const content = result.content as readonly { type: string; text?: string }[];
  const text = content.map((part) => part.text ?? "").join("");
  if (result.isError) throw new Error(`${name} failed: ${text}`);
  return JSON.parse(text) as T;
}

const { tools } = await client.listTools();
console.log(`step 0: connected; tools = ${tools.map((tool) => tool.name).join(", ")}`);

const operations = await call<readonly DiscoveredOperation[]>("discover", { protocol: "pendle" });
console.log("\nstep 1: discover");
for (const operation of operations) {
  console.log(
    `  ${operation.protocol}.${operation.method} (${operation.kind}) — ${operation.summary}`,
  );
}

const contracts = await call<readonly LoadedOperation[]>("load", {
  items: [
    { protocol: "pendle", method: "markets" },
    { protocol: "pendle", method: "quote" },
    { protocol: "pendle", method: "swap" },
  ],
});
console.log("\nstep 2: load — risk labels reach the Agent before anything is built");
for (const contract of contracts) {
  const risk = contract.risk?.length ? contract.risk.join(", ") : "none";
  console.log(`  ${contract.protocol}.${contract.method}: risk = ${risk}`);
}

const markets = await call<QueryEnvelope<readonly PendleMarketView[]>>("action", {
  protocol: "pendle",
  method: "markets",
  account: ACCOUNT,
  params: {},
});
const market = markets.data[0];
if (!market) throw new Error("no verified Pendle market available");
console.log(`\nstep 3: action markets — ${markets.data.length} verified, using ${market.name}`);
console.log(
  `  expiry ${market.expiryUtc}, APY ${market.aggregatedApy} (${market.apyProvenance.kind})`,
);

const swapParams = {
  market: market.market,
  tokenIn: market.underlying,
  tokenOut: market.pt,
  amountIn: SWAP_AMOUNT,
  slippageBps: SLIPPAGE_BPS,
};

const quote = await call<QueryEnvelope<PendleQuoteView>>("action", {
  protocol: "pendle",
  method: "quote",
  account: ACCOUNT,
  params: swapParams,
});
console.log("\nstep 4: action quote");
console.log(
  `  ${quote.data.amountIn} in -> ~${quote.data.estimatedOut} PT (min ${quote.data.minOut})`,
);

// A human decides here. The Agent may not sign, and Moss never will.
const capability = await call<CapabilityEnvelope>("action", {
  protocol: "pendle",
  method: "swap",
  account: ACCOUNT,
  params: swapParams,
});
console.log(
  `\nstep 5: action swap — unsigned ${capability.protocol}.${capability.method} tree, ${capability.children.length} children`,
);

const simulation = await call<AgentSimulation>("simulate", { capability });
console.log(`\nstep 6: simulate — ok = ${simulation.ok}`);
console.log(`  guidance: ${simulation.guidance}`);
for (const result of simulation.results) {
  console.log(`\n  ${result.protocol}.${result.method} (${result.warnings.length} warnings)`);
  for (const text of result.texts) console.log(`    ${text}`);
  for (const warning of result.warnings) console.log(`    !! ${warning.code}: ${warning.message}`);
}

await client.close();

if (!simulation.ok) {
  console.error("\nWarnings present. Stop; do not sign.");
  process.exit(1);
}
console.log("\nMCP path complete. Receipts are for human review; nothing was signed or sent.");
