import assert from "node:assert/strict";
import { createRuntime, Registry } from "@themoss/core";
import { ERC20Abi, ercManifest } from "@themoss/erc";
import { createMossServer } from "@themoss/mcp-server";
import { KuruOrderbookAbi, kuruManifest } from "@themoss/protocol-kuru";
import { createTraceSimulator } from "@themoss/simulator";
import { MONAD_CHAIN_ID, monadRuntime, systemManifest } from "@themoss/system";

const runtime = createRuntime({ chainId: MONAD_CHAIN_ID, rpcUrl: "http://127.0.0.1:8545" });
const registry = new Registry(runtime);
registry.use(ercManifest);
registry.use(systemManifest);
registry.use(kuruManifest);

assert.ok(registry.discover().length > 0, "published manifests should register public APIs");
assert.ok(ERC20Abi.length > 0, "ERC ABI should be present");
assert.ok(KuruOrderbookAbi.length > 0, "Kuru ABI should be present");
assert.equal(typeof createTraceSimulator(monadRuntime()).simulate, "function");
assert.ok(createMossServer().registry.discover().length > 0, "MCP public API should initialize");
