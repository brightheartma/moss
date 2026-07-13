import { createRuntime, type Plan, Registry } from "@themoss/core";
import { ERC20Abi, ercManifest } from "@themoss/erc";
import { createMossServer } from "@themoss/mcp-server";
import { KuruOrderbookAbi, kuruManifest } from "@themoss/protocol-kuru";
import { createTraceSimulator, type Simulator } from "@themoss/simulator";
import { MONAD_CHAIN_ID, monadRuntime, systemManifest } from "@themoss/system";

const runtime = createRuntime({ chainId: MONAD_CHAIN_ID, rpcUrl: "http://127.0.0.1:8545" });
const registry = new Registry(runtime);
registry.use(ercManifest);
registry.use(systemManifest);
registry.use(kuruManifest);

const simulator: Simulator = createTraceSimulator(monadRuntime());
const plans: Plan[] = [];
void simulator.simulate(plans);

const { registry: serverRegistry } = createMossServer();
serverRegistry.discover();

ERC20Abi satisfies readonly unknown[];
KuruOrderbookAbi satisfies readonly unknown[];
