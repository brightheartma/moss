import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Change, MossRuntime, ReceiptResult } from "@themoss/core";
import * as erc from "@themoss/erc";
import * as kuru from "@themoss/protocol-kuru";
import type { SimulateOutcome } from "@themoss/simulator";
import * as system from "@themoss/system";
import { describe, expect, it } from "vitest";
import { createMossServer, toAgentSimulation } from "../src/server.js";

const runtime = { rpcUrl: "http://offline", client: {} as MossRuntime["client"] };

async function connectedClient(simulateOutcome?: SimulateOutcome) {
  const { server, simulator } = createMossServer({ runtime, protocols: [system, erc, kuru] });
  if (simulateOutcome) {
    simulator.simulate = async () => simulateOutcome;
  }
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

function parseText(result: Awaited<ReturnType<Client["callTool"]>>): unknown {
  const content = result.content as { type: string; text: string }[];
  return JSON.parse(content[0]?.text ?? "null");
}

describe("moss MCP server", () => {
  it("exposes exactly discover, load, action, and simulate", async () => {
    const { tools } = await (await connectedClient()).listTools();
    expect(tools.map(({ name }) => name).sort()).toEqual([
      "action",
      "discover",
      "load",
      "simulate",
    ]);
  });

  it("discovers direct Protocol exports and loads type plus field descriptions", async () => {
    const client = await connectedClient();
    const discovered = parseText(
      await client.callTool({ name: "discover", arguments: { verb: "wrap" } }),
    ) as { protocol: string; method: string }[];
    expect(discovered).toEqual([
      expect.objectContaining({ protocol: "wmon", method: "wrap", kind: "capability" }),
    ]);
    const loaded = parseText(
      await client.callTool({
        name: "load",
        arguments: { items: [{ protocol: "kuru", method: "swap" }] },
      }),
    ) as { params: Record<string, { type: unknown; description: string }> }[];
    expect(loaded[0]?.params.slippage).toMatchObject({
      type: { default: 50, description: expect.stringContaining("1 bps equals 0.01%") },
      description: expect.stringContaining("adverse movement"),
    });
  });

  it("round-trips a Capability tree through action JSON", async () => {
    const capability = parseText(
      await (await connectedClient()).callTool({
        name: "action",
        arguments: {
          protocol: "wmon",
          method: "wrap",
          account: "0xcccccccccccccccccccccccccccccccccccccccc",
          params: { amount: "0.25" },
        },
      }),
    ) as { kind: string; receipt: string; children: unknown[] };
    expect(capability).toMatchObject({
      kind: "capability",
      protocol: "wmon",
      method: "wrap",
      receipt: "wrapReceipt",
    });
    expect(capability.children).toHaveLength(1);
  });

  it("publishes simulate as one recursive Capability input", async () => {
    const { tools } = await (await connectedClient()).listTools();
    const simulate = tools.find(({ name }) => name === "simulate");
    expect(simulate?.inputSchema).toMatchObject({
      type: "object",
      required: ["capability"],
      properties: { capability: expect.any(Object) },
    });
    expect(JSON.stringify(simulate?.inputSchema)).not.toContain("plans");
  });

  it("projects full SDK Receipts into ordered Agent text only", () => {
    const first = eventChange("0x1111111111111111111111111111111111111111");
    const second = eventChange("0x2222222222222222222222222222222222222222");
    const nested: ReceiptResult = {
      kind: "receipt",
      outcome: { operation: "transfer" },
      text: "nested summary",
      changes: [{ kind: "change", change: second, data: { amount: "2" }, text: "second" }],
    };
    const receipt: ReceiptResult = {
      kind: "receipt",
      outcome: { operation: "swap" },
      text: "root summary",
      changes: [{ kind: "change", change: first, data: { amount: "1" }, text: "first" }, nested],
    };
    const outcome: SimulateOutcome = {
      results: [
        {
          protocol: "kuru",
          method: "swap",
          transaction: {
            from: "0xcccccccccccccccccccccccccccccccccccccccc",
            to: "0xdddddddddddddddddddddddddddddddddddddddd",
            data: "0x",
            value: "0x0",
          },
          reverted: false,
          receipt,
          changes: [first, second],
          warnings: [],
          gas: "1",
        },
      ],
    };

    const projected = toAgentSimulation(outcome);
    expect(projected).toEqual({
      ok: true,
      guidance:
        "Compare every ordered Receipt text with the user's intent before handing transactions to a signer.",
      results: [{ protocol: "kuru", method: "swap", texts: ["first", "second"], warnings: [] }],
    });
    expect(JSON.stringify(projected)).not.toMatch(/"(?:outcome|change|data|transaction|gas)":/);
  });

  it("shows the exact Kuru simulation response an Agent receives", async () => {
    const user = "0xcccccccccccccccccccccccccccccccccccccccc";
    const router = "0xd651346d7c789536ebf06dc72aE3C8502cd695CC";
    const usdc = "0x754704Bc059F8C67012fEd69BC8A327a5aafb603";
    const ausd = "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a";
    const firstMarket = "0x1111111111111111111111111111111111111111";
    const secondMarket = "0x2222222222222222222222222222222222222222";
    const approveText = `ERC20 Approval: ${user} approved ${router} for 1000000 ${usdc}`;
    const swapTexts = [
      `ERC20 Transfer: 1000000 ${usdc} from ${user} to ${router}`,
      `Trade Event: 500000000000000000 at 123 emitted by ${firstMarket}`,
      `Trade Event: 600000 at 456 emitted by ${secondMarket}`,
      `ERC20 Transfer: 1200000 ${ausd} from ${router} to ${user}`,
      `Kuru Swap: 1000000 ${usdc} to 1200000 ${ausd} by ${user}`,
    ];
    const outcome: SimulateOutcome = {
      results: [
        simulationResult("erc20", "approve", receiptFromTexts([approveText])),
        simulationResult("kuru", "swap", receiptFromTexts(swapTexts)),
      ],
    };

    const client = await connectedClient(outcome);
    const response = parseText(
      await client.callTool({
        name: "simulate",
        arguments: {
          capability: {
            kind: "capability",
            protocol: "kuru",
            method: "swap",
            params: {},
            receipt: "swapReceipt",
            children: [],
          },
        },
      }),
    );

    expect(response).toEqual({
      ok: true,
      guidance:
        "Compare every ordered Receipt text with the user's intent before handing transactions to a signer.",
      results: [
        {
          protocol: "erc20",
          method: "approve",
          texts: [approveText],
          warnings: [],
        },
        {
          protocol: "kuru",
          method: "swap",
          texts: swapTexts,
          warnings: [],
        },
      ],
    });
  });
});

function eventChange(address: `0x${string}`): Change {
  return { kind: "event", address, topics: ["0x01"], data: "0x02" };
}

function receiptFromTexts(texts: readonly string[]): ReceiptResult {
  return {
    kind: "receipt",
    outcome: {},
    text: texts.join("; "),
    changes: texts.map((text, index) => ({
      kind: "change",
      change: eventChange(`0x${(index + 1).toString(16).padStart(40, "0")}`),
      data: null,
      text,
    })),
  };
}

function simulationResult(protocol: string, method: string, receipt: ReceiptResult) {
  return {
    protocol,
    method,
    transaction: {
      from: "0xcccccccccccccccccccccccccccccccccccccccc" as const,
      to: "0xdddddddddddddddddddddddddddddddddddddddd" as const,
      data: "0x" as const,
      value: "0x0" as const,
    },
    reverted: false,
    receipt,
    warnings: [],
    gas: "1",
  };
}
